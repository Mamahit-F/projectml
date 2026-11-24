package com.studentinsight.assistant;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantService {

    private static final String ASSISTANT_NAME = "Jago";
    private static final String GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
    private static final String GEMINI_API_REVISION = "2026-05-20";

    private static final List<String> DOMAIN_KEYWORDS = List.of(
            "studentinsight", "jago", "sistem", "aplikasi", "dashboard", "menu", "fitur", "halaman",
            "algoritma", "machine learning", "ml", "model", "kmeans", "k-means", "random forest",
            "decision tree", "ridge", "linear", "logistic", "agglomerative", "dbscan", "pca",
            "klaster", "cluster", "prediksi", "estimasi", "regresi", "klasifikasi", "akurasi", "rmse", "mae", "f1", "silhouette",
            "poin", "sabat", "pelanggaran", "pdf", "unggah", "upload", "hapus", "arsip", "sinkron", "excel", "ekspor", "export",
            "mahasiswa", "nim", "prodi", "fakultas", "unklab", "klabat", "outsider", "asrama",
            "pembinaan", "bina", "dibina", "konseling", "follow-up", "followup", "tindak lanjut",
            "kesejahteraan", "welfare", "bantuan", "darurat", "wali", "kontak",
            "risiko", "risk", "high", "medium", "low", "safe", "aman", "tinggi", "sedang", "rendah",
            "semester", "cutoff", "absen", "kontinuitas", "historis", "dataset", "kualitas", "panduan", "guide", "login", "akun", "profil", "database", "data",
            "halo", "hai", "hello", "selamat", "terima kasih", "makasih", "siapa kamu", "kamu siapa", "bisa apa", "bantu apa"
    );

    private static final List<String> CLEARLY_OUT_OF_CONTEXT_KEYWORDS = List.of(
            "resep", "masak", "nasi goreng", "cuaca", "hujan", "presiden", "politik", "pemilu",
            "sepak bola", "liga", "film", "lagu", "lirik", "puisi cinta", "ramalan zodiak",
            "harga bitcoin", "saham", "kripto", "crypto", "game", "gta", "minecraft", "mobile legends",
            "buatkan kode php", "buatkan kode python", "terjemahkan ke bahasa jepang"
    );

    private final AssistantContextService contextService;
    private final RestTemplate restTemplate;

    @Value("${app.assistant.provider:auto}")
    private String assistantProvider;

    @Value("${app.assistant.deepseek-api-key:}")
    private String deepseekApiKey;

    @Value("${app.assistant.deepseek-api-url:https://api.deepseek.com/chat/completions}")
    private String deepseekApiUrl;

    @Value("${app.assistant.deepseek-model:deepseek-chat}")
    private String deepseekModel;

    @Value("${app.assistant.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${app.assistant.gemini-model:gemini-3.5-flash-lite}")
    private String geminiModel;

    @Value("${app.assistant.gemini-fallback-models:gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.1-flash-lite}")
    private String geminiFallbackModels;

    public Map<String, Object> getStatus() {
        boolean deepseekReady = isDeepSeekConfigured();
        boolean geminiReady = isGeminiConfigured();
        List<String> order = resolveProviderOrder();

        String activeProvider = order.isEmpty() ? "LOCAL_FALLBACK" : order.get(0);
        String activeModel = "DEEPSEEK".equals(activeProvider)
                ? deepseekModel
                : ("GEMINI".equals(activeProvider) ? geminiModel : "LOCAL_FALLBACK");

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("assistantName", ASSISTANT_NAME);
        status.put("configuredProvider", assistantProvider);
        status.put("activeProvider", activeProvider);
        status.put("providerOrder", order);
        status.put("deepseekConfigured", deepseekReady);
        status.put("geminiConfigured", geminiReady);
        status.put("model", activeModel);
        status.put("mode", order.isEmpty() ? "LOCAL_FALLBACK" : "HYBRID_" + activeProvider);
        return status;
    }

    public AssistantChatResponse chat(AssistantChatRequest request) {
        String userMessage = request.getMessage() == null ? "" : request.getMessage().trim();
        List<AssistantChatRequest.ChatTurn> history = request.getHistory() != null ? request.getHistory() : List.of();

        // 1. Strict Out-of-Context Guardrail
        if (isOutOfContext(userMessage, history)) {
            return AssistantChatResponse.builder()
                    .assistantName(ASSISTANT_NAME)
                    .reply(buildOutOfContextReply())
                    .engine("GUARDRAIL")
                    .model("SCOPE_POLICY")
                    .outOfContext(true)
                    .sourcesUsed(List.of("Aturan Batasan Topik Jago"))
                    .timestamp(Instant.now())
                    .build();
        }

        // 2. Gather real-time live context from PostgreSQL + ML Service + Knowledge Base
        AssistantContextService.LiveContextBundle context = contextService.gatherLiveContext(userMessage);

        // 3. Call configured LLM providers in priority order (DeepSeek and/or Gemini)
        for (String provider : resolveProviderOrder()) {
            if ("DEEPSEEK".equals(provider)) {
                try {
                    String dsReply = callDeepSeekChatApi(userMessage, history, context.contextText());
                    if (dsReply != null && !dsReply.isBlank()) {
                        boolean refusedByModel = dsReply.toLowerCase(Locale.ROOT)
                                .contains("hanya membantu pertanyaan seputar sistem studentinsight");
                        return AssistantChatResponse.builder()
                                .assistantName(ASSISTANT_NAME)
                                .reply(dsReply.trim())
                                .engine("DEEPSEEK")
                                .model(deepseekModel)
                                .outOfContext(refusedByModel)
                                .sourcesUsed(context.sourcesUsed())
                                .timestamp(Instant.now())
                                .build();
                    }
                } catch (Exception ex) {
                    log.warn("DeepSeek model '{}' failed ({}); trying next provider if available.", deepseekModel, ex.getMessage());
                }
            } else if ("GEMINI".equals(provider)) {
                for (String candidateModel : buildCandidateModels()) {
                    for (int attempt = 1; attempt <= 2; attempt++) {
                        try {
                            String geminiReply = callGeminiInteractionsApi(candidateModel, userMessage, history, context.contextText());
                            if (geminiReply != null && !geminiReply.isBlank()) {
                                boolean refusedByModel = geminiReply.toLowerCase(Locale.ROOT)
                                        .contains("hanya membantu pertanyaan seputar sistem studentinsight");
                                return AssistantChatResponse.builder()
                                        .assistantName(ASSISTANT_NAME)
                                        .reply(geminiReply.trim())
                                        .engine("GEMINI")
                                        .model(candidateModel)
                                        .outOfContext(refusedByModel)
                                        .sourcesUsed(context.sourcesUsed())
                                        .timestamp(Instant.now())
                                        .build();
                            }
                            break;
                        } catch (HttpStatusCodeException ex) {
                            int code = ex.getStatusCode().value();
                            if (code == 503 && attempt == 1) {
                                log.warn("Gemini model '{}' returned 503 (attempt 1); retrying once after 700ms...", candidateModel);
                                try {
                                    Thread.sleep(700);
                                } catch (InterruptedException ie) {
                                    Thread.currentThread().interrupt();
                                    break;
                                }
                                continue;
                            }
                            log.warn("Gemini model '{}' failed (HTTP {}); trying next fallback model if available.", candidateModel, code);
                            break;
                        } catch (Exception ex) {
                            log.warn("Gemini model '{}' failed ({}); trying next fallback model if available.", candidateModel, ex.getMessage());
                            break;
                        }
                    }
                }
            }
        }

        if (!resolveProviderOrder().isEmpty()) {
            log.warn("All configured LLM providers failed; falling back to Smart Local Assistant.");
        }

        // 4. Smart Local Fallback (always works even without API key or during internet outage)
        String fallbackReply = buildLocalFallbackReply(userMessage, context.structuredStats());
        return AssistantChatResponse.builder()
                .assistantName(ASSISTANT_NAME)
                .reply(fallbackReply)
                .engine("LOCAL_FALLBACK")
                .model("LOCAL_RAG_V1")
                .outOfContext(false)
                .sourcesUsed(context.sourcesUsed())
                .timestamp(Instant.now())
                .build();
    }

    private List<String> resolveProviderOrder() {
        String pref = assistantProvider == null ? "auto" : assistantProvider.trim().toLowerCase(Locale.ROOT);
        List<String> order = new ArrayList<>();
        if ("gemini".equals(pref)) {
            if (isGeminiConfigured()) order.add("GEMINI");
            if (isDeepSeekConfigured()) order.add("DEEPSEEK");
        } else {
            // "deepseek" or "auto": prefer DeepSeek when configured (fast & stable), then Gemini
            if (isDeepSeekConfigured()) order.add("DEEPSEEK");
            if (isGeminiConfigured()) order.add("GEMINI");
        }
        return order;
    }

    boolean isDeepSeekConfigured() {
        return isValidApiKey(deepseekApiKey);
    }

    boolean isAnyLlmConfigured() {
        return isDeepSeekConfigured() || isGeminiConfigured();
    }

    private boolean isValidApiKey(String rawKey) {
        if (rawKey == null) return false;
        String trimmed = rawKey.trim();
        return !trimmed.isEmpty()
                && !trimmed.startsWith("CHANGE_ME")
                && !trimmed.startsWith("ISI_KEY");
    }

    private List<String> buildCandidateModels() {
        LinkedHashSet<String> ordered = new LinkedHashSet<>();
        if (geminiModel != null && !geminiModel.isBlank()) {
            ordered.add(geminiModel.trim());
        }
        if (geminiFallbackModels != null && !geminiFallbackModels.isBlank()) {
            for (String m : geminiFallbackModels.split(",")) {
                if (!m.isBlank()) ordered.add(m.trim());
            }
        }
        if (ordered.isEmpty()) {
            ordered.add("gemini-3.5-flash-lite");
        }
        return new ArrayList<>(ordered);
    }

    boolean isGeminiConfigured() {
        return isValidApiKey(geminiApiKey);
    }

    boolean isOutOfContext(String message, List<AssistantChatRequest.ChatTurn> history) {
        String lower = message.toLowerCase(Locale.ROOT);

        // Hard reject obviously unrelated queries regardless of history
        for (String banned : CLEARLY_OUT_OF_CONTEXT_KEYWORDS) {
            if (lower.contains(banned)) {
                return true;
            }
        }

        // Direct NIM match is always in-context
        if (lower.matches(".*\\b[a-z]?\\d{7,12}\\b.*")) {
            return false;
        }

        // Check domain keywords
        for (String kw : DOMAIN_KEYWORDS) {
            if (lower.contains(kw)) {
                return false;
            }
        }

        // Allow any nuanced/follow-up question to reach the LLM's strict system instruction when an LLM is configured
        if (isAnyLlmConfigured()) {
            return false;
        }

        if (history != null && !history.isEmpty() && lower.length() <= 60) {
            List<String> followUpCues = List.of("jelas", "simpel", "sederhana", "maksud", "contoh", "siapa", "berapa", "detail", "lanjut", "kenapa", "mengapa", "bagaimana");
            for (String cue : followUpCues) {
                if (lower.contains(cue)) {
                    return false;
                }
            }
        }

        return true;
    }

    private String buildSystemInstruction() {
        return """
                Kamu adalah Jago, asisten AI resmi yang tertanam di dalam aplikasi StudentInsight (Universitas Klabat).
                
                ATURAN WAJIB (TIDAK BOLEH DILANGGAR):
                1. Kamu HANYA boleh menjawab pertanyaan yang berkaitan dengan sistem StudentInsight, tujuan & cara penggunaan fitur-fiturnya, data mahasiswa/pembinaan/kesejahteraan/PDF/risiko di dalamnya, dan konsep/algoritma Machine Learning yang diterapkan di sistem ini.
                2. Jika user bertanya sesuatu di luar konteks StudentInsight (misalnya resep masakan, berita, politik, hiburan, cuaca, coding umum di luar sistem, tugas kuliah lain, dll.), TOLAK dengan sopan menggunakan kalimat: "Maaf, saya Jago dan saya hanya membantu pertanyaan seputar sistem StudentInsight." lalu tawarkan contoh pertanyaan yang relevan.
                3. Gunakan bahasa Indonesia yang ramah, jelas, mudah dimengerti sehari-hari, analitis, dan langsung menjawab inti pertanyaan user (pakai poin/nomor seperlunya). JANGAN gunakan simbol LaTeX seperti $K$ atau $R^2$ (tulis biasa: K=7, R²).
                4. Jawab HANYA berdasarkan KONTEKS DATA LIVE & PENGETAHUAN SISTEM yang diberikan. Jangan mengulang template perkenalan berulang-ulang jika user bertanya hal spesifik! Jangan mengarang angka, nama mahasiswa, atau fitur yang tidak ada di konteks. Jika ada perbedaan antara model aktif di registry dengan anggapan user, jelaskan secara transparan berdasarkan data live registry.
                5. Saat menyebut hasil klastering atau prediksi ML, selalu jaga nada etis: tegaskan bahwa hasil ML adalah estimasi statistik pendukung pembinaan proaktif, BUKAN vonis hukuman.
                """;
    }

    @SuppressWarnings("unchecked")
    private String callDeepSeekChatApi(
            String userMessage,
            List<AssistantChatRequest.ChatTurn> history,
            String liveContextText) {

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content", buildSystemInstruction() + "\nKONTEKS PENGETAHUAN & DATA LIVE STUDENTINSIGHT SAAT INI:\n" + liveContextText
        ));

        if (history != null && !history.isEmpty()) {
            int start = Math.max(0, history.size() - 8);
            for (int i = start; i < history.size(); i++) {
                AssistantChatRequest.ChatTurn turn = history.get(i);
                if (turn.getText() == null || turn.getText().isBlank()) continue;
                String role = "user".equalsIgnoreCase(turn.getRole()) ? "user" : "assistant";
                String snippet = turn.getText().length() > 1000 ? turn.getText().substring(0, 1000) + "..." : turn.getText();
                messages.add(Map.of("role", role, "content", snippet));
            }
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(deepseekApiKey.trim());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", deepseekModel != null && !deepseekModel.isBlank() ? deepseekModel.trim() : "deepseek-chat");
        payload.put("messages", messages);
        payload.put("temperature", 0.3);
        payload.put("max_tokens", 1024);
        payload.put("stream", false);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(deepseekApiUrl, entity, Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return null;
            }
            return extractDeepSeekText(response.getBody());
        } catch (HttpStatusCodeException ex) {
            log.warn("DeepSeek API returned HTTP {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw ex;
        }
    }

    @SuppressWarnings("unchecked")
    String extractDeepSeekText(Map<String, Object> body) {
        if (body == null) return null;
        Object choicesObj = body.get("choices");
        if (choicesObj instanceof List<?> choices && !choices.isEmpty()) {
            Object first = choices.get(0);
            if (first instanceof Map<?, ?> choice && choice.get("message") instanceof Map<?, ?> msg) {
                Object content = msg.get("content");
                if (content != null) {
                    return String.valueOf(content);
                }
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String callGeminiInteractionsApi(
            String targetModel,
            String userMessage,
            List<AssistantChatRequest.ChatTurn> history,
            String liveContextText) {

        String systemInstruction = buildSystemInstruction();

        StringBuilder prompt = new StringBuilder();
        prompt.append("KONTEKS PENGETAHUAN & DATA LIVE STUDENTINSIGHT SAAT INI:\n");
        prompt.append(liveContextText).append("\n");

        if (history != null && !history.isEmpty()) {
            prompt.append("RIWAYAT PERCAKAPAN SEBELUMNYA (maks 6 giliran terakhir):\n");
            int start = Math.max(0, history.size() - 6);
            for (int i = start; i < history.size(); i++) {
                AssistantChatRequest.ChatTurn turn = history.get(i);
                if (turn.getText() == null || turn.getText().isBlank()) continue;
                String speaker = "user".equalsIgnoreCase(turn.getRole()) ? "User" : "Jago";
                String snippet = turn.getText().length() > 500 ? turn.getText().substring(0, 500) + "..." : turn.getText();
                prompt.append(speaker).append(": ").append(snippet).append("\n");
            }
            prompt.append("\n");
        }

        prompt.append("PERTANYAAN USER SAAT INI:\n").append(userMessage);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", geminiApiKey.trim());
        headers.set("Api-Revision", GEMINI_API_REVISION);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", targetModel);
        payload.put("system_instruction", systemInstruction);
        payload.put("input", prompt.toString());
        payload.put("store", false);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(GEMINI_INTERACTIONS_URL, entity, Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return null;
            }
            return extractInteractionText(response.getBody());
        } catch (HttpStatusCodeException ex) {
            log.warn("Gemini Interactions API returned HTTP {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw ex;
        }
    }

    @SuppressWarnings("unchecked")
    String extractInteractionText(Map<String, Object> body) {
        if (body == null) return null;
        // Interactions API returns `steps` array containing `model_output` steps with `content[].text`
        Object stepsObj = body.get("steps");
        if (stepsObj instanceof List<?> steps) {
            StringBuilder collected = new StringBuilder();
            for (Object stepObj : steps) {
                if (!(stepObj instanceof Map<?, ?> step)) continue;
                if (!"model_output".equals(step.get("type"))) continue;
                Object contentObj = step.get("content");
                if (contentObj instanceof List<?> parts) {
                    for (Object pObj : parts) {
                        if (pObj instanceof Map<?, ?> part && "text".equals(part.get("type")) && part.get("text") != null) {
                            collected.append(part.get("text"));
                        }
                    }
                }
            }
            if (collected.length() > 0) {
                return collected.toString();
            }
        }
        // Secondary compatibility check (`outputs` array)
        Object outputsObj = body.get("outputs");
        if (outputsObj instanceof List<?> outputs) {
            StringBuilder collected = new StringBuilder();
            for (Object outObj : outputs) {
                if (outObj instanceof Map<?, ?> out && out.get("text") != null) {
                    collected.append(out.get("text"));
                }
            }
            if (collected.length() > 0) {
                return collected.toString();
            }
        }
        return null;
    }

    private String buildOutOfContextReply() {
        return "Maaf, saya **Jago** dan saya hanya membantu pertanyaan seputar sistem **StudentInsight** — seperti cara kerja fitur, data mahasiswa, status pembinaan, kesejahteraan, unggah/hapus PDF, deteksi risiko, dan analisis Machine Learning.\n\n"
                + "Silakan tanyakan hal seputar sistem Anda, misalnya:\n"
                + "- *\"Algoritma machine learning apa yang digunakan di sistem ini?\"*\n"
                + "- *\"Apakah sudah ada mahasiswa yang dilakukan pembinaan?\"*\n"
                + "- *\"Bagaimana cara kerja unggah dan hapus PDF?\"*";
    }

    @SuppressWarnings("unchecked")
    private String buildLocalFallbackReply(String userMessage, Map<String, Object> stats) {
        String q = userMessage.toLowerCase(Locale.ROOT);

        // 1. Specific student lookup result
        if (stats.containsKey("lookedUpMlPrediction") || stats.containsKey("lookedUpDbStudent")) {
            StringBuilder sb = new StringBuilder();
            if (stats.get("lookedUpDbStudent") instanceof Map<?, ?> db) {
                sb.append("Berikut data mahasiswa dari database **StudentInsight**:\n")
                        .append("- **Nama / NIM:** ").append(db.get("name")).append(" (`").append(db.get("nim")).append("`)\n")
                        .append("- **Fakultas / Prodi:** ").append(db.get("faculty")).append(" — ").append(db.get("studyProgram")).append("\n")
                        .append("- **Poin Terakhir:** ").append(db.get("points")).append(" poin (Risiko: **").append(db.get("risk")).append("**)\n")
                        .append("- **Catatan Pembinaan:** ").append(db.get("followUpCount")).append(" sesi\n");
            }
            if (stats.get("lookedUpMlPrediction") instanceof Map<?, ?> pred) {
                if (sb.length() > 0) sb.append("\n");
                Object stObj = pred.get("student");
                if (stObj instanceof Map<?, ?> st) {
                    sb.append("**Hasil Analisis ML Historis** untuk **").append(st.get("student_name")).append("** (`").append(st.get("nim")).append("`):\n")
                            .append("- **Status Kontinuitas:** ").append(st.get("continuity_status")).append(" (pola `").append(st.get("presence_pattern")).append("`)\n")
                            .append("- **Poin Terakhir / Rata-rata:** ").append(st.get("latest_observed_points")).append(" / ").append(st.get("observed_avg_points")).append(" poin\n");
                }
                if (Boolean.TRUE.equals(pred.get("eligible"))) {
                    if (pred.get("regression_estimate") instanceof Map<?, ?> reg) {
                        sb.append("- **Estimasi Poin Periode Berikutnya:** **").append(reg.get("predicted_next_points")).append(" poin** (").append(reg.get("algorithm")).append(")\n");
                    }
                    if (pred.get("classification_estimate") instanceof Map<?, ?> cls) {
                        sb.append("- **Kategori Prediksi:** **").append(cls.get("predicted_category")).append("** (").append(cls.get("algorithm")).append(")\n");
                    }
                    if (pred.get("cluster_profile") instanceof Map<?, ?> cp) {
                        sb.append("- **Klaster Profil:** #").append(cp.get("cluster_id")).append(" — ").append(cp.get("cluster_label")).append("\n");
                    }
                    sb.append("\n*Catatan: Hasil prediksi merupakan estimasi statistik untuk mendukung pembinaan proaktif, bukan vonis pelanggaran.*");
                } else {
                    sb.append("- **Status Prediksi:** Tidak diprediksi — ").append(pred.get("reason"));
                }
            }
            return sb.toString();
        }

        // 2. Pembinaan / follow-up
        if (q.contains("bina") || q.contains("konseling") || q.contains("follow")) {
            long total = asLong(stats.get("followUpTotal"));
            long completed = asLong(stats.get("followUpCompleted"));
            long scheduled = asLong(stats.get("followUpScheduled"));
            long needed = asLong(stats.get("followUpNeeded"));
            long unique = asLong(stats.get("followUpUniqueStudents"));
            long highUnfollowed = asLong(stats.get("highRiskUnfollowed"));

            if (total == 0) {
                return "Berdasarkan data live di database saat ini, **belum ada catatan sesi pembinaan** yang tersimpan (total `0` sesi).\n\n"
                        + "Saat ini ada **" + highUnfollowed + " mahasiswa berisiko tinggi (HIGH)** yang bisa diprioritaskan untuk dijadwalkan pembinaan di menu **Pembinaan**.";
            }
            StringBuilder sb = new StringBuilder();
            sb.append("Ya, berdasarkan data live di database saat ini sudah tercatat **").append(total)
                    .append(" sesi pembinaan** untuk **").append(unique).append(" mahasiswa**:\n")
                    .append("- **Selesai (`COMPLETED`):** ").append(completed).append(" sesi\n")
                    .append("- **Terjadwal (`SCHEDULED`):** ").append(scheduled).append(" sesi\n")
                    .append("- **Perlu Tindak Lanjut (`FOLLOW_UP_NEEDED`):** ").append(needed).append(" sesi\n")
                    .append("- **Mahasiswa risiko HIGH belum dibina:** ").append(highUnfollowed).append(" mahasiswa\n");
            if (stats.get("recentFollowUps") instanceof List<?> recent && !recent.isEmpty()) {
                sb.append("\n**Catatan terbaru:**\n");
                for (int i = 0; i < Math.min(3, recent.size()); i++) {
                    if (recent.get(i) instanceof Map<?, ?> r) {
                        sb.append("- ").append(r.get("name")).append(" (`").append(r.get("nim")).append("`) — ")
                                .append(r.get("status")).append(" (").append(r.get("date")).append(")\n");
                    }
                }
            }
            return sb.toString();
        }

        // 3a. Specific ML concept explanations (K-Means/PCA/Agglomerative/DBSCAN, Random Forest, Decision Tree, Ridge, Tujuan)
        if (q.contains("k-means") || q.contains("kmeans") || q.contains("pca") || q.contains("agglomerative") || q.contains("dbscan")) {
            return "**Penjelasan K-Means (K=7) + PCA 2D di StudentInsight:**\n"
                    + "- **K-Means (`K=7`):** Algoritma *unsupervised learning* yang mengelompokkan mahasiswa ke dalam **7 profil pola akumulasi poin** berdasarkan 14 fitur historis lintas semester (rata-rata poin, maks/min, persentil, kemiringan tren, dan frekuensi periode berpoin) tanpa label awal. `K=7` terpilih otomatis setelah pengujian `K=2..8` karena keseimbangan Silhouette Score (`0.3849`), Davies-Bouldin (`1.038`), dan proporsi klaster yang sehat.\n"
                    + "- **PCA 2D:** Teknik reduksi dimensi yang memadatkan 14 fitur tersebut menjadi 2 sumbu koordinat `(X, Y)` khusus untuk menampilkan peta sebaran klaster secara visual di grafik scatter dashboard.\n"
                    + "- **Pembanding (*Agglomerative Clustering* & *DBSCAN*):** Ikut dilatih sebagai tolok ukur objektif—*Agglomerative (Ward)* mengelompokkan secara hierarkis namun tidak memiliki `.predict()` untuk data baru, sedangkan *DBSCAN* berbasis kepadatan sehingga banyak memisahkan mahasiswa ekstrem sebagai *noise*. Karena itu **K-Means** dipilih sebagai model aktif utama.\n\n"
                    + "*Catatan etika: Klaster hanya menunjukkan pola statistik historis, bukan vonis disiplin.*";
        }

        if (q.contains("random forest") || q.contains("decision tree") || q.contains("ridge") || q.contains("logistic")) {
            return "**Penjelasan Model Prediksi Supervised di StudentInsight:**\n"
                    + "- **Random Forest Regressor (Aktif — Regresi):** Menggabungkan rata-rata tebakan 200 pohon keputusan untuk memperkirakan **angka poin** periode berikutnya dari 22 fitur historis bebas kebocoran data (RMSE `34.49`, R² `0.56`), dibandingkan dengan *Decision Tree Regressor* dan *Ridge Regression* (`alpha=500`).\n"
                    + "- **Decision Tree Classifier (Aktif — Klasifikasi):** Menggunakan alur aturan Ya/Tidak untuk memprediksi kategori **LOW** (`0–8`), **MEDIUM** (`8–40`), atau **HIGH** (`> 40` poin), dipilih karena memiliki *Recall* tertinggi untuk kelas HIGH (`81.72%`), dibandingkan dengan *Random Forest Classifier* dan *Logistic Regression*.\n\n"
                    + "*Catatan etika: Hasil prediksi adalah estimasi statistik pendukung pembinaan proaktif, bukan jaminan pelanggaran.*";
        }

        if (q.contains("tujuan") || q.contains("manfaat") || q.contains("fungsi sistem")) {
            return "**Tujuan Utama Sistem StudentInsight (Universitas Klabat):**\n"
                    + "1. **Otomatisasi Data Poin Sabat:** Membaca laporan PDF Village Dean secara cepat dan akurat tanpa rekap manual.\n"
                    + "2. **Deteksi Dini & Pembinaan Proaktif:** Mengelompokkan tingkat risiko secara dinamis (`SAFE`, `LOW`, `MEDIUM`, `HIGH`) agar pembina dapat mendekati mahasiswa berpoin tinggi lebih awal.\n"
                    + "3. **Analisis Pola & Prediksi Lintas Semester:** Menemukan profil historis mahasiswa (Klastering) dan memperkirakan tren poin periode berikutnya (Regresi & Klasifikasi).\n"
                    + "4. **Tindak Lanjut Terpadu:** Menghubungkan data poin dengan catatan **Pembinaan**, bantuan **Kesejahteraan**, **Kontak Darurat**, dan laporan Excel.";
        }

        // 3b. ML Algorithms overview
        if (q.contains("algoritma") || q.contains("machine learning") || q.contains("ml") || q.contains("model") || q.contains("klaster")) {
            return "Sistem **StudentInsight** menerapkan **4 komponen Machine Learning** menggunakan Scikit-learn:\n"
                    + "1. **Dynamic K-Means + Proyeksi Tren** — mengelompokkan risiko (`SAFE`, `LOW`, `MEDIUM`, `HIGH`) secara dinamis tiap unggah PDF baru.\n"
                    + "2. **K-Means (`K=7`) + PCA 2D** — menemukan 7 pola profil historis mahasiswa lintas semester (dibandingkan dengan *Agglomerative Clustering* dan *DBSCAN*).\n"
                    + "3. **Random Forest Regressor (Aktif)** — memprediksi angka poin periode berikutnya (dibandingkan dengan *Ridge Regression* dan *Decision Tree Regressor*).\n"
                    + "4. **Decision Tree Classifier (Aktif)** — memprediksi kategori `LOW / MEDIUM / HIGH` dengan kepekaan tinggi menangkap kelas HIGH (dibandingkan dengan *Logistic Regression* dan *Random Forest Classifier*).\n\n"
                    + "Semua metrik, grafik evaluasi, dan pemilihan model aktif dapat dilihat langsung di menu **Pusat ML Historis**.";
        }

        // 4. PDF workflow
        if (q.contains("pdf") || q.contains("unggah") || q.contains("hapus") || q.contains("sinkron")) {
            long pdfCount = asLong(stats.get("pdfCount"));
            return "Saat ini tersimpan **" + pdfCount + " dokumen PDF** di arsip sistem.\n\n"
                    + "**Alur kerja Unggah & Hapus PDF:**\n"
                    + "1. Buka menu **Unggah & Arsip PDF** lalu pilih file PDF laporan poin Sabat dari Village Dean untuk melihat pratinjau otomatis.\n"
                    + "2. Klik **Simpan Data & Jalankan Analisis Risiko** agar data mahasiswa tersimpan dan risikonya langsung dianalisis.\n"
                    + "3. Jika sebuah PDF dihapus, mahasiswa yang *hanya* berasal dari PDF tersebut ikut terhapus otomatis, sedangkan mahasiswa yang tercatat di PDF lain akan dihitung ulang poin dan risikonya.";
        }

        // 5. Kesejahteraan / Welfare
        if (q.contains("kesejahteraan") || q.contains("welfare") || q.contains("bantuan")) {
            return "Data **Kesejahteraan Mahasiswa** saat ini mencatat total **" + asLong(stats.get("welfareTotal")) + " laporan**:\n"
                    + "- **Aktif / Sedang Diproses:** " + asLong(stats.get("welfareOpen")) + " laporan\n"
                    + "- **Selesai / Ditutup:** " + asLong(stats.get("welfareResolved")) + " laporan\n\n"
                    + "Anda dapat menambah atau memperbarui status bantuan di menu **Kesejahteraan**.";
        }

        // 6. Risiko / Dashboard summary
        if (q.contains("risiko") || q.contains("high") || q.contains("ringkasan") || q.contains("berapa") || q.contains("status")) {
            return "Berikut ringkasan data live **StudentInsight** saat ini (" + stats.getOrDefault("semesterName", "Semester Aktif") + "):\n"
                    + "- **Mahasiswa Aktif:** " + asLong(stats.get("totalStudents")) + " mahasiswa (" + asLong(stats.get("zeroPointStudents")) + " aman 0 poin, " + asLong(stats.get("studentsWithPoints")) + " memiliki poin)\n"
                    + "- **Sebaran Risiko:** HIGH `" + asLong(stats.get("highRiskCount")) + "` • MEDIUM `" + asLong(stats.get("mediumRiskCount")) + "` • LOW `" + asLong(stats.get("lowRiskCount")) + "` • SAFE `" + asLong(stats.get("safeCount")) + "`\n"
                    + "- **Arsip PDF:** " + asLong(stats.get("pdfCount")) + " dokumen | **Sesi Pembinaan:** " + asLong(stats.get("followUpTotal")) + " sesi | **Kesejahteraan:** " + asLong(stats.get("welfareTotal")) + " laporan";
        }

        // 7. Default helpful system overview
        return "Halo! Saya **Jago**, asisten AI khusus sistem **StudentInsight**.\n\n"
                + "**StudentInsight** bekerja dalam 4 alur utama:\n"
                + "1. **Unggah & Arsip PDF** untuk membaca data poin Sabat mahasiswa secara otomatis.\n"
                + "2. **Deteksi Risiko Dinamis** untuk memetakan status `SAFE`, `LOW`, `MEDIUM`, dan `HIGH`.\n"
                + "3. **Pusat ML Historis** untuk melihat pola klaster mahasiswa lintas semester dan prediksi periode berikutnya.\n"
                + "4. **Pembinaan, Kesejahteraan & Kontak Darurat** untuk tindak lanjut serta ekspor laporan Excel.\n\n"
                + "Silakan tanyakan detail fitur, status pembinaan, algoritma ML, atau sebutkan **NIM mahasiswa** untuk saya cek langsung.";
    }

    private long asLong(Object val) {
        if (val instanceof Number n) return n.longValue();
        return 0L;
    }
}
