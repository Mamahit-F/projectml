package com.studentinsight.student.dto;

import com.studentinsight.emergency.EmergencyContact;
import com.studentinsight.residence.dto.ResidenceCategoryDTO;
import com.studentinsight.student.Student;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDTO {
    private Long id;
    private String nim;
    private String fullName;
    private String studyProgram;
    private String faculty;
    private String phoneNumber;
    private ResidenceCategoryDTO residenceCategory;
    private String currentAddress;
    private String status;
    private String qrToken;
    private Integer totalViolationPoints;
    private List<EmergencyContactDTO> emergencyContacts;
    private Instant createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmergencyContactDTO {
        private Long id;
        private String contactName;
        private String relationship;
        private String phoneNumber;
        private String address;

        public static EmergencyContactDTO fromEntity(EmergencyContact entity) {
            return EmergencyContactDTO.builder()
                    .id(entity.getId())
                    .contactName(entity.getContactName())
                    .relationship(entity.getRelationship())
                    .phoneNumber(entity.getPhoneNumber())
                    .address(entity.getAddress())
                    .build();
        }
    }

    public static StudentDTO fromEntity(Student entity) {
        return StudentDTO.builder()
                .id(entity.getId())
                .nim(entity.getNim())
                .fullName(entity.getFullName())
                .studyProgram(entity.getStudyProgram())
                .faculty(entity.getFaculty())
                .phoneNumber(entity.getPhoneNumber())
                .residenceCategory(ResidenceCategoryDTO.fromEntity(entity.getResidenceCategory()))
                .currentAddress(entity.getCurrentAddress())
                .status(entity.getStatus())
                .qrToken(entity.getQrToken())
                .totalViolationPoints(entity.getTotalViolationPoints())
                .emergencyContacts(entity.getEmergencyContacts() != null ?
                        entity.getEmergencyContacts().stream()
                                .map(EmergencyContactDTO::fromEntity)
                                .collect(Collectors.toList()) : List.of())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
