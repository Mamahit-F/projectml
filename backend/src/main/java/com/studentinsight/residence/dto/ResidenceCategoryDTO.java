package com.studentinsight.residence.dto;

import com.studentinsight.residence.ResidenceCategory;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResidenceCategoryDTO {
    private Long id;
    private String code;
    @NotBlank(message = "Category name is required")
    private String name;
    private Integer maxDistanceMeters;
    private String description;
    private boolean active;

    public static ResidenceCategoryDTO fromEntity(ResidenceCategory entity) {
        return ResidenceCategoryDTO.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .maxDistanceMeters(entity.getMaxDistanceMeters())
                .description(entity.getDescription())
                .active(entity.isActive())
                .build();
    }
}
