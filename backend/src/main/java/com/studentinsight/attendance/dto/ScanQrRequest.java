package com.studentinsight.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ScanQrRequest {
    @NotBlank(message = "QR Token is required")
    private String qrToken;

    @NotNull(message = "Worship Event ID is required")
    private Long worshipEventId;
}
