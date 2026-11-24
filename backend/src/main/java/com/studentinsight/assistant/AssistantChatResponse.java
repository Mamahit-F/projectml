package com.studentinsight.assistant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssistantChatResponse {
    private String assistantName;
    private String reply;
    private String engine;      // "GEMINI" or "LOCAL_FALLBACK" or "GUARDRAIL"
    private String model;
    private boolean outOfContext;
    private List<String> sourcesUsed;
    private Instant timestamp;
}
