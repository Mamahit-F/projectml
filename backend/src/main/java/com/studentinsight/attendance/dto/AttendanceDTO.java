package com.studentinsight.attendance.dto;

import com.studentinsight.attendance.Attendance;
import com.studentinsight.attendance.AttendanceMethod;
import com.studentinsight.attendance.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDTO {
    private Long id;
    private Long studentId;
    private String studentNim;
    private String studentName;
    private String studentResidenceCode;
    private String studentResidenceName;
    private Long worshipEventId;
    private String worshipEventTitle;
    private AttendanceStatus status;
    private AttendanceMethod recordedMethod;
    private Instant checkInTime;
    private String verifiedByName;
    private String notes;
    private Instant createdAt;

    public static AttendanceDTO fromEntity(Attendance entity) {
        return AttendanceDTO.builder()
                .id(entity.getId())
                .studentId(entity.getStudent().getId())
                .studentNim(entity.getStudent().getNim())
                .studentName(entity.getStudent().getFullName())
                .studentResidenceCode(entity.getStudent().getResidenceCategory() != null ? entity.getStudent().getResidenceCategory().getCode() : null)
                .studentResidenceName(entity.getStudent().getResidenceCategory() != null ? entity.getStudent().getResidenceCategory().getName() : null)
                .worshipEventId(entity.getWorshipEvent().getId())
                .worshipEventTitle(entity.getWorshipEvent().getTitle())
                .status(entity.getStatus())
                .recordedMethod(entity.getRecordedMethod())
                .checkInTime(entity.getCheckInTime())
                .verifiedByName(entity.getVerifiedByUser() != null ? entity.getVerifiedByUser().getFullName() : null)
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
