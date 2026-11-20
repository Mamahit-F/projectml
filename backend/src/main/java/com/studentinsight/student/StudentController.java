package com.studentinsight.student;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.common.QrCodeGenerator;
import com.studentinsight.student.dto.CreateStudentRequest;
import com.studentinsight.student.dto.StudentDTO;
import com.studentinsight.student.dto.UpdateStudentRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<StudentDTO>>> searchStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long residenceCategoryId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Page<StudentDTO> students = studentService.searchStudents(search, residenceCategoryId, status, PageRequest.of(page, size, sort));
        return ResponseEntity.ok(ApiResponse.ok("Students retrieved successfully", students));
    }

    @GetMapping("/active-list")
    public ResponseEntity<ApiResponse<List<StudentDTO>>> getAllActiveStudents() {
        return ResponseEntity.ok(ApiResponse.ok("Active students list retrieved", studentService.getAllActiveStudents()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDTO>> getStudentById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Student details retrieved", studentService.getStudentById(id)));
    }

    @GetMapping("/nim/{nim}")
    public ResponseEntity<ApiResponse<StudentDTO>> getStudentByNim(@PathVariable String nim) {
        return ResponseEntity.ok(ApiResponse.ok("Student details retrieved", studentService.getStudentByNim(nim)));
    }

    @GetMapping("/by-qr/{qrToken}")
    public ResponseEntity<ApiResponse<StudentDTO>> getStudentByQrToken(@PathVariable String qrToken) {
        return ResponseEntity.ok(ApiResponse.ok("Student identified from QR token", studentService.getStudentByQrToken(qrToken)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<StudentDTO>> createStudent(@Valid @RequestBody CreateStudentRequest request) {
        StudentDTO created = studentService.createStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Student registered successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<StudentDTO>> updateStudent(@PathVariable Long id, @Valid @RequestBody UpdateStudentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Student updated successfully", studentService.updateStudent(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> archiveStudent(@PathVariable Long id) {
        studentService.archiveStudent(id);
        return ResponseEntity.ok(ApiResponse.ok("Student successfully archived", null));
    }

    @PostMapping("/{id}/refresh-qr")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<StudentDTO>> refreshQrToken(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("QR token regenerated", studentService.refreshQrToken(id)));
    }

    @PostMapping("/{id}/regenerate-qr")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<StudentDTO>> regenerateQrToken(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("QR token regenerated", studentService.refreshQrToken(id)));
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivateStudent(@PathVariable Long id) {
        studentService.archiveStudent(id);
        return ResponseEntity.ok(ApiResponse.ok("Student successfully archived", null));
    }

    @GetMapping("/{id}/qr-code")
    public ResponseEntity<ApiResponse<Map<String, String>>> getQrCode(@PathVariable Long id) {
        StudentDTO student = studentService.getStudentById(id);
        String qrBase64 = QrCodeGenerator.toPngDataUrl(student.getQrToken(), 8);
        return ResponseEntity.ok(ApiResponse.ok("QR code generated", Map.of(
                "qrToken", student.getQrToken(),
                "qrCodeBase64", qrBase64
        )));
    }
}
