package com.studentinsight;

import com.studentinsight.assistant.AssistantChatRequest;
import com.studentinsight.assistant.AssistantChatResponse;
import com.studentinsight.assistant.AssistantContextService;
import com.studentinsight.assistant.AssistantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssistantServiceTest {

    @Mock
    private AssistantContextService contextService;

    @Mock
    private RestTemplate restTemplate;

    private AssistantService assistantService;

    @BeforeEach
    void setUp() {
        assistantService = new AssistantService(contextService, restTemplate);
        ReflectionTestUtils.setField(assistantService, "assistantProvider", "auto");
        ReflectionTestUtils.setField(assistantService, "deepseekApiKey", "");
        ReflectionTestUtils.setField(assistantService, "deepseekApiUrl", "https://api.deepseek.com/chat/completions");
        ReflectionTestUtils.setField(assistantService, "deepseekModel", "deepseek-chat");
        ReflectionTestUtils.setField(assistantService, "geminiApiKey", "");
        ReflectionTestUtils.setField(assistantService, "geminiModel", "gemini-3.5-flash-lite");
        ReflectionTestUtils.setField(assistantService, "geminiFallbackModels", "gemini-3.5-flash-lite,gemini-3.8-flash");
    }

    @Test
    void chat_OutOfContextQuestion_IsPolitelyRefusedByGuardrail() {
        AssistantChatRequest req = AssistantChatRequest.builder()
                .message("Tolong buatkan resep nasi goreng enak")
                .build();

        AssistantChatResponse resp = assistantService.chat(req);

        assertEquals("Jago", resp.getAssistantName());
        assertEquals("GUARDRAIL", resp.getEngine());
        assertTrue(resp.isOutOfContext());
        assertTrue(resp.getReply().contains("StudentInsight"));
        verifyNoInteractions(contextService, restTemplate);
    }

    @Test
    void chat_InDomainQuestionWithoutApiKey_UsesSmartLocalFallbackWithLiveStats() {
        when(contextService.gatherLiveContext(anyString())).thenReturn(
                new AssistantContextService.LiveContextBundle(
                        "Live context",
                        List.of("PostgreSQL (Pembinaan & Kesejahteraan)"),
                        Map.of(
                                "followUpTotal", 6L,
                                "followUpCompleted", 4L,
                                "followUpScheduled", 2L,
                                "followUpNeeded", 0L,
                                "followUpUniqueStudents", 5L,
                                "highRiskUnfollowed", 10L
                        )
                )
        );

        AssistantChatRequest req = AssistantChatRequest.builder()
                .message("Apakah sudah ada mahasiswa yang dilakukan pembinaan?")
                .build();

        AssistantChatResponse resp = assistantService.chat(req);

        assertEquals("Jago", resp.getAssistantName());
        assertEquals("LOCAL_FALLBACK", resp.getEngine());
        assertFalse(resp.isOutOfContext());
        assertTrue(resp.getReply().contains("6 sesi pembinaan"));
        verifyNoInteractions(restTemplate);
    }

    @Test
    @SuppressWarnings("unchecked")
    void chat_WithGeminiApiKey_CallsInteractionsApiAndParsesModelOutput() {
        ReflectionTestUtils.setField(assistantService, "geminiApiKey", "AIzaSy-test-key-12345");

        when(contextService.gatherLiveContext(anyString())).thenReturn(
                new AssistantContextService.LiveContextBundle("System KB", List.of("Knowledge Base"), Map.of())
        );

        Map<String, Object> mockBody = Map.of(
                "id", "int_123",
                "status", "completed",
                "steps", List.of(
                        Map.of(
                                "type", "model_output",
                                "content", List.of(
                                        Map.of("type", "text", "text", "Sistem menggunakan K-Means, Random Forest, dan Decision Tree.")
                                )
                        )
                )
        );
        when(restTemplate.postForEntity(contains("/v1beta/interactions"), any(), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(mockBody));

        AssistantChatRequest req = AssistantChatRequest.builder()
                .message("Algoritma machine learning apa yang digunakan?")
                .build();

        AssistantChatResponse resp = assistantService.chat(req);

        assertEquals("GEMINI", resp.getEngine());
        assertEquals("gemini-3.5-flash-lite", resp.getModel());
        assertFalse(resp.isOutOfContext());
        assertTrue(resp.getReply().contains("Random Forest"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void chat_WithDeepSeekApiKey_PrefersDeepSeekAndParsesChoices() {
        ReflectionTestUtils.setField(assistantService, "deepseekApiKey", "sk-test-deepseek-key-12345");
        ReflectionTestUtils.setField(assistantService, "geminiApiKey", "AIzaSy-test-key-12345");

        when(contextService.gatherLiveContext(anyString())).thenReturn(
                new AssistantContextService.LiveContextBundle("System KB + Registry", List.of("FastAPI ML Service"), Map.of())
        );

        Map<String, Object> mockBody = Map.of(
                "id", "chatcmpl-123",
                "choices", List.of(
                        Map.of(
                                "index", 0,
                                "message", Map.of(
                                        "role", "assistant",
                                        "content", "Model LinearRegression sedang berstatus ACTIVE di registry saat ini."
                                )
                        )
                )
        );
        when(restTemplate.postForEntity(contains("api.deepseek.com/chat/completions"), any(), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(mockBody));

        AssistantChatRequest req = AssistantChatRequest.builder()
                .message("Kenapa di hasil prediksi muncul LinearRegression?")
                .build();

        AssistantChatResponse resp = assistantService.chat(req);

        assertEquals("DEEPSEEK", resp.getEngine());
        assertEquals("deepseek-chat", resp.getModel());
        assertFalse(resp.isOutOfContext());
        assertTrue(resp.getReply().contains("LinearRegression"));
    }
}
