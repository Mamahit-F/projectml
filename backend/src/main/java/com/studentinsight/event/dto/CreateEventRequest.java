package com.studentinsight.event.dto;

import com.studentinsight.event.EventStatus;
import com.studentinsight.event.EventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class CreateEventRequest {
    @NotBlank(message = "Event title is required")
    private String title;

    @NotNull(message = "Event type is required")
    private EventType eventType;

    @NotNull(message = "Event date is required")
    private LocalDate eventDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    @NotBlank(message = "Location is required")
    private String location;

    private EventStatus status = EventStatus.SCHEDULED;
    private String description;
}
