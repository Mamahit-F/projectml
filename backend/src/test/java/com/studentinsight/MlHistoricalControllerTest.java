package com.studentinsight;

import com.studentinsight.config.CustomUserDetailsService;
import com.studentinsight.config.JwtAuthenticationEntryPoint;
import com.studentinsight.config.JwtTokenProvider;
import com.studentinsight.config.SecurityConfig;
import com.studentinsight.ml.MlHistoricalController;
import com.studentinsight.ml.MlHistoricalService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MlHistoricalController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class})
class MlHistoricalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MlHistoricalService mlHistoricalService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getStatus_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/ml/status"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    void getStatus_Authenticated_Returns200WithData() throws Exception {
        when(mlHistoricalService.getStatus()).thenReturn(Map.of(
                "service_status", "UP",
                "ml_service_online", true,
                "dataset_ready", true
        ));

        mockMvc.perform(get("/api/v1/ml/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.service_status").value("UP"));
    }

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    void predictStudent_Authenticated_ReturnsEstimate() throws Exception {
        when(mlHistoricalService.predictStudent(any())).thenReturn(Map.of(
                "eligible", true,
                "is_estimate_not_guarantee", true
        ));

        mockMvc.perform(post("/api/v1/ml/predict")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nim\":\"12510613\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.eligible").value(true));
    }
}
