package com.studentinsight.event.dto;

import com.studentinsight.event.EventStatus;
import com.studentinsight.event.EventType;
import com.studentinsight.event.WorshipEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorshipEventDTO {
    private Long id;
    private String title;
    private EventType eventType;
    private LocalDate eventDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String location;
    private EventStatus status;
    private String description;
    private Instant createdAt;

    public static WorshipEventDTO fromEntity(WorshipEvent entity) {
        return WorshipEventDTO.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .eventType(entity.getEventType())
                .eventDate(entity.getEventDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .location(entity.getLocation())
                .status(entity.getStatus())
                .description(entity.getDescription())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
