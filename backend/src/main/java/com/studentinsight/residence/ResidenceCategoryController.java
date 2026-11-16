package com.studentinsight.residence;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.residence.dto.ResidenceCategoryDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/residence-categories")
@RequiredArgsConstructor
public class ResidenceCategoryController {

    private final ResidenceCategoryService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ResidenceCategoryDTO>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok("Residence categories retrieved", service.getAllCategories()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ResidenceCategoryDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Residence category retrieved", service.getById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ResidenceCategoryDTO>> update(@PathVariable Long id, @Valid @RequestBody ResidenceCategoryDTO dto) {
        return ResponseEntity.ok(ApiResponse.ok("Residence category updated", service.updateCategory(id, dto)));
    }
}
