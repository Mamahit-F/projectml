package com.studentinsight.assistant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssistantChatRequest {

    @NotBlank(message = "Pesan tidak boleh kosong.")
    @Size(max = 2000, message = "Pesan maksimal 2000 karakter.")
    private String message;

    @Builder.Default
    private List<ChatTurn> history = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatTurn {
        private String role; // "user" or "assistant"
        private String text;
    }
}
