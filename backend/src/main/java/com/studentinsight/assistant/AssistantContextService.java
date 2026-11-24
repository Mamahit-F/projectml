package com.studentinsight.assistant;

import com.studentinsight.dashboard.DashboardService;
import com.studentinsight.dashboard.dto.DashboardOverviewDTO;
import com.studentinsight.emergency.EmergencyContactRepository;
import com.studentinsight.followup.FollowUpRecord;
import com.studentinsight.followup.FollowUpRecordRepository;
import com.studentinsight.ml.MlClientService;
import com.studentinsight.pdfreport.PdfReport;
import com.studentinsight.pdfreport.PdfReportRepository;
import com.studentinsight.semester.SemesterSetting;
import com.studentinsight.semester.SemesterSettingService;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.welfare.WelfareReport;
import com.studentinsight.welfare.WelfareReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantContextService {

    private static final Pattern NIM_PATTERN = Pattern.compile("\\b([A-Za-z]?\\d{7,12})\\b");

    private final DashboardService dashboardService;
    private final StudentRepository studentRepository;
    private final FollowUpRecordRepository followUpRepository;
    private final WelfareReportRepository welfareReportRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final PdfReportRepository pdfReportRepository;
    private final SemesterSettingService semesterSettingService;
    private final MlClientService mlClientService;

    public record LiveContextBundle(
            String contextText,
            List<String> sourcesUsed,
            Map<String, Object> structuredStats
    ) {}

    @Transactional(readOnly = true)
    public LiveContextBundle gatherLiveContext(String userQuestion) {
        String q = userQuestion == null ? "" : userQuestion.toLowerCase(Locale.ROOT);
        List<String> sources = new ArrayList<>();
        Map<String, Object> stats = new LinkedHashMap<>();
        StringBuilder sb = new StringBuilder();

        // 1. Static Knowledge Base of StudentInsight
        sb.append("=== PENGETAHUAN RESMI SISTEM STUDENTINSIGHT ===\n");
        sb.append("Nama Aplikasi: StudentInsight (Sistem Pemantauan Poin Sabat, Deteksi Risiko, Pembinaan, Kesejahteraan, dan Analisis ML Historis Mahasiswa di Luar Asrama Universitas Klabat).\n");
        sb.append("Menu Utama di Sidebar:\n");
        sb.append("1. Dashboard (/dashboard): Ringkasan KPI mahasiswa aktif, rata-rata/maks poin, distribusi risiko, sebaran per program studi, tren antar-PDF.\n");
        sb.append("2. Unggah & Arsip PDF (/pdf-reports): Unggah PDF poin Sabat dari Village Dean, pratinjau otomatis baris/prodi/poin, impor + jalankan analisis risiko. Saat PDF dihapus, mahasiswa yang HANYA berasal dari PDF tersebut otomatis terhapus, sedangkan mahasiswa yang juga ada di PDF lain dihitung ulang poin dan risikonya. Ada tombol 'Sinkronkan Mahasiswa' untuk membersihkan data yatim.\n");
        sb.append("3. Mahasiswa (/students): Daftar, pencarian, filter prodi/risiko, detail riwayat poin, kontak darurat.\n");
        sb.append("4. Deteksi Risiko (/predictions): Pengelompokan risiko dinamis (SAFE, LOW, MEDIUM, HIGH) menggunakan Dynamic K-Means Clustering + proyeksi kecepatan poin (damping 0.85) menuju tanggal cutoff semester.\n");
        sb.append("5. Pusat ML Historis (/ml-analytics): Analisis lintas periode historis (5 periode, 35 file PDF/XLSX, 9.572 baris, 2.911 entitas unik) dengan 8 tab: Ringkasan, Dataset & Kualitas, Kontinuitas (7 kategori status kehadiran), Klastering Profil (K-Means K=7 + PCA 2D, dibanding Agglomerative & DBSCAN), Pelatihan & Evaluasi, Perbandingan Model, Prediksi Mahasiswa (Regresi: Random Forest Regressor; Klasifikasi: Decision Tree Classifier), dan Riwayat Latih.\n");
        sb.append("6. Pembinaan (/follow-up): Pencatatan sesi konseling/pembinaan mahasiswa (status SCHEDULED, COMPLETED, FOLLOW_UP_NEEDED).\n");
        sb.append("7. Kesejahteraan (/welfare): Laporan bantuan/kesejahteraan mahasiswa (HOUSING, SECURITY, FINANCIAL, HEALTH, GENERAL_AID; status OPEN, IN_REVIEW, RESOLVED, CLOSED).\n");
        sb.append("8. Kontak Darurat (/emergency-contacts): Daftar wali/orang tua mahasiswa.\n");
        sb.append("9. Laporan & Semester (/reports-settings): Pengaturan tanggal semester/cutoff/batas akhir dan ekspor laporan Excel (.xlsx).\n");
        sb.append("10. Mode Panduan: Panduan spotlight interaktif di setiap halaman + Buku Panduan & Glosarium.\n");
        sb.append("Prinsip Etika ML: Klastering adalah pengelompokan pola statistik (BUKAN vonis disiplin), dan prediksi adalah estimasi statistik pendukung pembinaan proaktif (BUKAN jaminan pelanggaran).\n\n");
        sources.add("Knowledge Base StudentInsight");

        // 2. Live PostgreSQL Overview
        try {
            DashboardOverviewDTO ov = dashboardService.getOverview();
            SemesterSetting sem = semesterSettingService.getOrCreateDefault();
            List<PdfReport> reports = pdfReportRepository.findAllByOrderByReportDateDescCreatedAtDesc();
            long emergencyCount = emergencyContactRepository.count();

            var predSum = ov.getPredictionSummary();
            long safeCount = predSum != null ? predSum.getSafeCount() : 0L;
            long lowRiskCount = predSum != null ? predSum.getLowRiskCount() : 0L;
            long medRiskCount = predSum != null ? predSum.getMediumRiskCount() : 0L;
            long highRiskCount = predSum != null ? predSum.getHighRiskCount() : 0L;

            stats.put("totalStudents", ov.getTotalStudents());
            stats.put("zeroPointStudents", ov.getZeroPointStudents());
            stats.put("studentsWithPoints", ov.getStudentsWithPoints());
            stats.put("avgPoints", ov.getAvgPoints());
            stats.put("maxPoints", ov.getMaxPoints());
            stats.put("safeCount", safeCount);
            stats.put("lowRiskCount", lowRiskCount);
            stats.put("mediumRiskCount", medRiskCount);
            stats.put("highRiskCount", highRiskCount);
            stats.put("pdfCount", reports.size());
            stats.put("emergencyCount", emergencyCount);
            stats.put("semesterName", sem.getSemesterName());

            sb.append("=== DATA LIVE POSTGRESQL SAAT INI ===\n");
            sb.append(String.format("Semester Aktif: %s (Mulai: %s, Cutoff Absen: %s, Akhir: %s, Absen Ditutup: %s)\n",
                    sem.getSemesterName(), sem.getSemesterStartDate(), sem.getAttendanceCutoffDate(),
                    sem.getSemesterEndDate(), sem.isAttendanceClosed() ? "Ya" : "Belum"));
            sb.append(String.format("Mahasiswa Aktif di Database: %d total (%d berpoin 0 / aman, %d memiliki poin > 0, rata-rata %.1f poin, maks %d poin)\n",
                    ov.getTotalStudents(), ov.getZeroPointStudents(), ov.getStudentsWithPoints(),
                    ov.getAvgPoints(), ov.getMaxPoints()));
            sb.append(String.format("Sebaran Risiko Saat Ini: SAFE=%d, LOW=%d, MEDIUM=%d, HIGH=%d\n",
                    safeCount, lowRiskCount, medRiskCount, highRiskCount));
            sb.append(String.format("Arsip Laporan PDF: %d dokumen tersimpan | Kontak Darurat: %d catatan\n",
                    reports.size(), emergencyCount));

            if (!reports.isEmpty()) {
                sb.append("Daftar Arsip PDF Terbaru (maks 5):\n");
                for (int i = 0; i < Math.min(5, reports.size()); i++) {
                    PdfReport r = reports.get(i);
                    sb.append(String.format("  - [%s] %s (%s) — %d mhs, rata-rata %.1f poin, maks %d\n",
                            r.getReportDate(), r.getFileName(), r.getFacultyName(),
                            r.getTotalStudents(), r.getAvgPoints(), r.getMaxPoints()));
                }
            }

            // Top priority / high-risk students
            if (ov.getPriorityStudents() != null && !ov.getPriorityStudents().isEmpty()) {
                sb.append("Contoh Mahasiswa Prioritas / Risiko Tinggi Teratas (maks 8):\n");
                List<Map<String, Object>> topHigh = new ArrayList<>();
                for (int i = 0; i < Math.min(8, ov.getPriorityStudents().size()); i++) {
                    var hs = ov.getPriorityStudents().get(i);
                    sb.append(String.format("  - %s (NIM: %s, Prodi: %s) — %d poin, delta %+d, risiko %s\n",
                            hs.getFullName(), hs.getNim(), hs.getStudyProgram(),
                            hs.getLatestSabbathPoints(), hs.getPointsDelta(), hs.getRiskCategory()));
                    topHigh.add(Map.of("name", String.valueOf(hs.getFullName()), "nim", String.valueOf(hs.getNim()),
                            "points", hs.getLatestSabbathPoints() != null ? hs.getLatestSabbathPoints() : 0));
                }
                stats.put("topHighRisk", topHigh);
            }
            sources.add("PostgreSQL (Dashboard, Mahasiswa, PDF)");
        } catch (Exception ex) {
            log.warn("Jago failed to read dashboard overview: {}", ex.getMessage());
        }

        // 3. Live Pembinaan (Follow-up) & Kesejahteraan (Welfare)
        try {
            List<FollowUpRecord> followUps = followUpRepository.findAll();
            long fuTotal = followUps.size();
            long fuCompleted = followUps.stream().filter(f -> "COMPLETED".equalsIgnoreCase(f.getStatus())).count();
            long fuScheduled = followUps.stream().filter(f -> "SCHEDULED".equalsIgnoreCase(f.getStatus())).count();
            long fuNeeded = followUps.stream().filter(f -> "FOLLOW_UP_NEEDED".equalsIgnoreCase(f.getStatus())).count();
            Set<Long> counseledStudentIds = followUps.stream()
                    .filter(f -> f.getStudent() != null)
                    .map(f -> f.getStudent().getId())
                    .collect(Collectors.toSet());

            long highUnfollowed = studentRepository.findByStatus("ACTIVE").stream()
                    .filter(s -> "HIGH".equalsIgnoreCase(s.getRiskCategory()) && !counseledStudentIds.contains(s.getId()))
                    .count();

            stats.put("followUpTotal", fuTotal);
            stats.put("followUpCompleted", fuCompleted);
            stats.put("followUpScheduled", fuScheduled);
            stats.put("followUpNeeded", fuNeeded);
            stats.put("followUpUniqueStudents", counseledStudentIds.size());
            stats.put("highRiskUnfollowed", highUnfollowed);

            sb.append(String.format("\nData Pembinaan (follow_up_records): Total %d sesi untuk %d mahasiswa unik (COMPLETED=%d, SCHEDULED=%d, FOLLOW_UP_NEEDED=%d). Mahasiswa HIGH tanpa catatan pembinaan=%d.\n",
                    fuTotal, counseledStudentIds.size(), fuCompleted, fuScheduled, fuNeeded, highUnfollowed));

            List<Map<String, Object>> recentFuList = new ArrayList<>();
            followUps.stream()
                    .sorted(Comparator.comparing(FollowUpRecord::getCounselingDate, Comparator.nullsLast(Comparator.reverseOrder())))
                    .limit(6)
                    .forEach(f -> {
                        String sName = f.getStudent() != null ? f.getStudent().getFullName() : "-";
                        String sNim = f.getStudent() != null ? f.getStudent().getNim() : "-";
                        sb.append(String.format("  - [%s] %s (%s) | Status: %s | Topik: %s\n",
                                f.getCounselingDate(), sName, sNim, f.getStatus(), f.getTopicsDiscussed()));
                        recentFuList.add(Map.of(
                                "date", String.valueOf(f.getCounselingDate()),
                                "name", sName,
                                "nim", sNim,
                                "status", String.valueOf(f.getStatus()),
                                "topic", String.valueOf(f.getTopicsDiscussed())
                        ));
                    });
            stats.put("recentFollowUps", recentFuList);

            List<WelfareReport> welfares = welfareReportRepository.findAll();
            long wTotal = welfares.size();
            long wOpen = welfares.stream().filter(w -> "OPEN".equalsIgnoreCase(w.getStatus()) || "IN_REVIEW".equalsIgnoreCase(w.getStatus())).count();
            long wResolved = welfares.stream().filter(w -> "RESOLVED".equalsIgnoreCase(w.getStatus()) || "CLOSED".equalsIgnoreCase(w.getStatus())).count();
            stats.put("welfareTotal", wTotal);
            stats.put("welfareOpen", wOpen);
            stats.put("welfareResolved", wResolved);

            sb.append(String.format("Data Kesejahteraan (welfare_reports): Total %d laporan (Aktif/Diproses=%d, Selesai=%d).\n",
                    wTotal, wOpen, wResolved));
            sources.add("PostgreSQL (Pembinaan & Kesejahteraan)");
        } catch (Exception ex) {
            log.warn("Jago failed to read follow-up/welfare data: {}", ex.getMessage());
        }

        // 4. Live Historical ML Service Status, Active Models & Candidates
        try {
            Map<String, Object> mlStatus = mlClientService.get("/ml/status", null);
            sb.append("\n=== STATUS LAYANAN ML HISTORIS (LIVE DARI REGISTRY) ===\n");
            sb.append("Dataset Siap: ").append(mlStatus.get("dataset_ready"))
                    .append(" | Versi Dataset: ").append(mlStatus.get("latest_dataset_version")).append("\n");
            Object selectedModels = mlStatus.get("selected_models");
            if (selectedModels instanceof Map<?, ?> sm) {
                sb.append("Model yang SEDANG AKTIF di Registry Saat Ini (selected_models): ").append(sm).append("\n");
                sb.append("Catatan Penting: Admin dapat mengubah model aktif kapan saja di menu Pusat ML Historis -> tab Perbandingan Model. Jika model aktif berbeda dari rekomendasi awal (misal LinearRegression aktif alih-alih RandomForestRegressor), jelaskan secara jujur bahwa di registry saat ini model itulah yang sedang dipilih aktif dan cara menggantinya kembali.\n");
                stats.put("selectedModels", sm);
            }
            try {
                Map<String, Object> modelsResp = mlClientService.get("/ml/models", null);
                if (modelsResp.get("models") instanceof List<?> modelList && !modelList.isEmpty()) {
                    sb.append("Daftar Seluruh Model Terlatih di Registry (Status ACTIVE vs CANDIDATE):\n");
                    for (Object mObj : modelList) {
                        if (mObj instanceof Map<?, ?> mm) {
                            sb.append(String.format("  - [%s] %s (%s) | status=%s | metrik=%s\n",
                                    mm.get("model_type"), mm.get("algorithm"), mm.get("model_id"),
                                    mm.get("status"), mm.get("evaluation_metrics")));
                        }
                    }
                }
            } catch (Exception ignored) {
            }
            if (q.contains("algoritma") || q.contains("evaluasi") || q.contains("metrik") || q.contains("akurasi")
                    || q.contains("rmse") || q.contains("silhouette") || q.contains("klaster") || q.contains("model")
                    || q.contains("machine learning") || q.contains("ml") || q.contains("linear") || q.contains("random forest")) {
                Map<String, Object> eval = mlClientService.get("/ml/evaluation", null);
                sb.append("Ringkasan Evaluasi ML Aktif: ").append(summarizeMlEvaluation(eval)).append("\n");
                stats.put("mlEvaluationSummary", summarizeMlEvaluation(eval));
            }
            sources.add("FastAPI ML Service");
        } catch (Exception ex) {
            sb.append("\n=== STATUS LAYANAN ML HISTORIS ===\nLayanan ML sedang tidak terjangkau saat ini (").append(ex.getMessage()).append(").\n");
        }

        // 5. Specific Student Lookup (NIM or Name mentioned in question)
        appendSpecificStudentContext(userQuestion, sb, sources, stats);

        return new LiveContextBundle(sb.toString(), sources, stats);
    }

    @SuppressWarnings("unchecked")
    private void appendSpecificStudentContext(String question, StringBuilder sb, List<String> sources, Map<String, Object> stats) {
        if (question == null || question.isBlank()) return;

        String detectedNim = null;
        Matcher m = NIM_PATTERN.matcher(question);
        if (m.find()) {
            detectedNim = m.group(1).toUpperCase(Locale.ROOT);
        }

        Student dbStudent = null;
        if (detectedNim != null) {
            dbStudent = studentRepository.findByNim(detectedNim).orElse(null);
        } else {
            // Try gentle name search if user appears to ask about a specific person
            String lower = question.toLowerCase(Locale.ROOT);
            if (lower.contains("mahasiswa ") || lower.contains("nama ") || lower.contains("cek ") || lower.contains("prediksi ")) {
                String candidate = extractCandidateName(question);
                if (candidate != null && candidate.length() >= 4) {
                    var page = studentRepository.searchStudents(candidate, null, null, null, null, PageRequest.of(0, 3));
                    if (!page.isEmpty()) {
                        dbStudent = page.getContent().get(0);
                        detectedNim = dbStudent.getNim();
                    }
                }
            }
        }

        if (dbStudent != null) {
            sb.append("\n=== DETAIL MAHASISWA YANG DITANYAKAN (DATABASE) ===\n");
            sb.append(String.format("Nama: %s | NIM: %s | Fakultas: %s | Prodi: %s | Status: %s\n",
                    dbStudent.getFullName(), dbStudent.getNim(), dbStudent.getFaculty(),
                    dbStudent.getStudyProgram(), dbStudent.getStatus()));
            sb.append(String.format("Poin Sabat Terakhir: %d | Delta: %+d | Kategori Risiko: %s | Proyeksi Akhir: %s\n",
                    dbStudent.getLatestSabbathPoints() != null ? dbStudent.getLatestSabbathPoints() : 0,
                    dbStudent.getPointsDelta() != null ? dbStudent.getPointsDelta() : 0,
                    dbStudent.getRiskCategory(),
                    dbStudent.getProjectedEndPoints() != null ? String.format("%.1f", dbStudent.getProjectedEndPoints()) : "-"));

            List<FollowUpRecord> stuFu = followUpRepository.findByStudentIdOrderByCounselingDateDesc(dbStudent.getId());
            sb.append("Riwayat Pembinaan Mahasiswa Ini: ").append(stuFu.size()).append(" sesi.\n");
            for (int i = 0; i < Math.min(3, stuFu.size()); i++) {
                FollowUpRecord r = stuFu.get(i);
                sb.append(String.format("  - [%s] %s — %s\n", r.getCounselingDate(), r.getStatus(), r.getTopicsDiscussed()));
            }
            stats.put("lookedUpDbStudent", Map.of(
                    "name", String.valueOf(dbStudent.getFullName()),
                    "nim", String.valueOf(dbStudent.getNim()),
                    "faculty", String.valueOf(dbStudent.getFaculty()),
                    "studyProgram", String.valueOf(dbStudent.getStudyProgram()),
                    "points", dbStudent.getLatestSabbathPoints() != null ? dbStudent.getLatestSabbathPoints() : 0,
                    "risk", String.valueOf(dbStudent.getRiskCategory()),
                    "followUpCount", stuFu.size()
            ));
            sources.add("Detail Mahasiswa DB (" + dbStudent.getNim() + ")");
        }

        if (detectedNim != null) {
            try {
                Map<String, Object> predReq = Map.of(
                        "nim", detectedNim,
                        "next_is_same_semester", false,
                        "expected_days_to_next", 120
                );
                Map<String, Object> pred = mlClientService.post("/ml/predict", predReq);
                sb.append("\n=== HASIL PREDIKSI & PROFIL ML HISTORIS UNTUK NIM ").append(detectedNim).append(" ===\n");
                sb.append("Layak Prediksi (Eligible): ").append(pred.get("eligible")).append("\n");
                if (pred.get("student") instanceof Map<?, ?> st) {
                    sb.append("Nama Historis: ").append(st.get("student_name"))
                            .append(" | Fakultas: ").append(st.get("faculty"))
                            .append(" | Prodi: ").append(st.get("study_program"))
                            .append(" | Status Kontinuitas: ").append(st.get("continuity_status"))
                            .append(" | Pola Hadir: ").append(st.get("presence_pattern"))
                            .append(" | Poin Terakhir: ").append(st.get("latest_observed_points"))
                            .append(" | Rata-rata Poin: ").append(st.get("observed_avg_points")).append("\n");
                }
                if (pred.get("regression_estimate") instanceof Map<?, ?> reg) {
                    sb.append("Estimasi Regresi (").append(reg.get("algorithm")).append("): ")
                            .append(reg.get("predicted_next_points")).append(" poin (rentang: ")
                            .append(reg.get("estimate_range_hint")).append(")\n");
                }
                if (pred.get("classification_estimate") instanceof Map<?, ?> cls) {
                    sb.append("Estimasi Klasifikasi (").append(cls.get("algorithm")).append("): ")
                            .append(cls.get("predicted_category")).append(" (keyakinan: ")
                            .append(cls.get("confidence")).append(", probabilitas: ")
                            .append(cls.get("probabilities")).append(")\n");
                }
                if (pred.get("cluster_profile") instanceof Map<?, ?> cp) {
                    sb.append("Klaster Profil: #").append(cp.get("cluster_id")).append(" — ")
                            .append(cp.get("cluster_label")).append("\n");
                }
                if (Boolean.FALSE.equals(pred.get("eligible")) && pred.get("reason") != null) {
                    sb.append("Alasan Tidak Diprediksi: ").append(pred.get("reason")).append("\n");
                }
                stats.put("lookedUpMlPrediction", pred);
                sources.add("Prediksi ML Historis (" + detectedNim + ")");
            } catch (Exception ex) {
                log.debug("No historical ML record for NIM {}: {}", detectedNim, ex.getMessage());
            }
        }
    }

    private String extractCandidateName(String question) {
        String cleaned = question.replaceAll("(?i)(tolong|coba|cek|lihat|bagaimana|kondisi|prediksi|status|riwayat|poin|pembinaan|mahasiswa|bernama|nama|dengan|untuk|dari|yang|ada|apakah|siapa|\\?|\\.)", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (cleaned.isEmpty()) return null;
        String[] words = cleaned.split(" ");
        if (words.length == 0) return null;
        // Take first 1-2 meaningful words if not generic domain words
        Set<String> stop = Set.of("sistem", "risiko", "tinggi", "sedang", "rendah", "aktif", "hari", "ini", "saat", "sudah", "belum", "semua", "daftar");
        List<String> kept = new ArrayList<>();
        for (String w : words) {
            if (w.length() >= 3 && !stop.contains(w.toLowerCase(Locale.ROOT))) {
                kept.add(w);
                if (kept.size() == 2) break;
            }
        }
        return kept.isEmpty() ? null : String.join(" ", kept);
    }

    @SuppressWarnings("unchecked")
    private String summarizeMlEvaluation(Map<String, Object> eval) {
        if (eval == null || eval.isEmpty()) return "Belum tersedia.";
        StringBuilder out = new StringBuilder();
        Object activeModels = eval.get("active_models");
        if (activeModels instanceof Map<?, ?> am) {
            am.forEach((k, v) -> {
                if (v instanceof Map<?, ?> mv) {
                    out.append(k).append("=").append(mv.get("algorithm"))
                            .append(" ").append(mv.get("evaluation_metrics")).append("; ");
                }
            });
        }
        return out.length() > 0 ? out.toString() : "3 model aktif (K-Means K=7, RandomForestRegressor, DecisionTreeClassifier).";
    }
}
