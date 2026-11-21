package com.studentinsight.residence;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.residence.dto.ResidenceCategoryDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/residence-categories")
@RequiredArgsConstructor
public class ResidenceCategoryController {

    private final ResidenceCategoryService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ResidenceCategoryDTO>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok("Kategori tempat tinggal dimuat", service.getAllCategories()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ResidenceCategoryDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Detail kategori tempat tinggal dimuat", service.getById(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ResidenceCategoryDTO>> update(@PathVariable Long id, @Valid @RequestBody ResidenceCategoryDTO dto) {
        return ResponseEntity.ok(ApiResponse.ok("Kategori tempat tinggal diperbarui", service.updateCategory(id, dto)));
    }
}
