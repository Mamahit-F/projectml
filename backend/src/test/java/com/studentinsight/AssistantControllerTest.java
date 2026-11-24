package com.studentinsight;

import com.studentinsight.assistant.AssistantChatResponse;
import com.studentinsight.assistant.AssistantController;
import com.studentinsight.assistant.AssistantService;
import com.studentinsight.config.CustomUserDetailsService;
import com.studentinsight.config.JwtAuthenticationEntryPoint;
import com.studentinsight.config.JwtTokenProvider;
import com.studentinsight.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AssistantController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class})
class AssistantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AssistantService assistantService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void chat_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(post("/api/v1/assistant/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Halo Jago\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    void status_Authenticated_Returns200() throws Exception {
        when(assistantService.getStatus()).thenReturn(Map.of(
                "assistantName", "Jago",
                "geminiConfigured", false,
                "model", "LOCAL_FALLBACK"
        ));

        mockMvc.perform(get("/api/v1/assistant/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.assistantName").value("Jago"));
    }

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    void chat_Authenticated_ReturnsReply() throws Exception {
        when(assistantService.chat(any())).thenReturn(
                AssistantChatResponse.builder()
                        .assistantName("Jago")
                        .reply("Halo! Saya Jago.")
                        .engine("LOCAL_FALLBACK")
                        .model("LOCAL_RAG_V1")
                        .outOfContext(false)
                        .sourcesUsed(List.of("Knowledge Base"))
                        .timestamp(Instant.now())
                        .build()
        );

        mockMvc.perform(post("/api/v1/assistant/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Bagaimana cara kerja sistem ini?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.assistantName").value("Jago"));
    }
}
