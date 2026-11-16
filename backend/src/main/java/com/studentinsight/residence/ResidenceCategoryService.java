package com.studentinsight.residence;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.residence.dto.ResidenceCategoryDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResidenceCategoryService {

    private final ResidenceCategoryRepository repository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<ResidenceCategoryDTO> getAllCategories() {
        return repository.findAll().stream()
                .map(ResidenceCategoryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ResidenceCategoryDTO getById(Long id) {
        return repository.findById(id)
                .map(ResidenceCategoryDTO::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("ResidenceCategory", "id", id));
    }

    @Transactional
    public ResidenceCategoryDTO updateCategory(Long id, ResidenceCategoryDTO dto) {
        ResidenceCategory category = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResidenceCategory", "id", id));

        category.setName(dto.getName());
        category.setMaxDistanceMeters(dto.getMaxDistanceMeters());
        category.setDescription(dto.getDescription());
        category.setActive(dto.isActive());

        ResidenceCategory saved = repository.save(category);
        auditLogService.log("UPDATE_RESIDENCE_CATEGORY", "ResidenceCategory", saved.getId(), null, saved.getCode(), "Updated residence category parameters");
        return ResidenceCategoryDTO.fromEntity(saved);
    }
}
