package com.studentinsight.student;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.pdfreport.PdfReportService;
import com.studentinsight.student.dto.StudentDTO;
import com.studentinsight.student.dto.UpdateStudentRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final PdfReportService pdfReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<StudentDTO>>> searchStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String studyProgram,
            @RequestParam(required = false) String riskCategory,
            @RequestParam(required = false) Long residenceCategoryId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "latestSabbathPoints") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Page<StudentDTO> students = studentService.searchStudents(
                search, studyProgram, riskCategory, residenceCategoryId, status, PageRequest.of(page, size, sort));
        return ResponseEntity.ok(ApiResponse.ok("Daftar mahasiswa dimuat", students));
    }

    @GetMapping("/study-programs")
    public ResponseEntity<ApiResponse<List<String>>> getStudyPrograms() {
        return ResponseEntity.ok(ApiResponse.ok("Daftar program studi dimuat", studentService.getDistinctStudyPrograms()));
    }

    @GetMapping("/active-list")
    public ResponseEntity<ApiResponse<List<StudentDTO>>> getAllActiveStudents() {
        return ResponseEntity.ok(ApiResponse.ok("Daftar mahasiswa aktif dimuat", studentService.getAllActiveStudents()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDTO>> getStudentById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Detail mahasiswa dimuat", studentService.getStudentById(id)));
    }

    @GetMapping("/{id}/point-history")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPointHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Riwayat poin mahasiswa dimuat", pdfReportService.getStudentPointHistory(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDTO>> updateStudent(@PathVariable Long id, @Valid @RequestBody UpdateStudentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Profil mahasiswa berhasil diperbarui", studentService.updateStudent(id, request)));
    }

    @PostMapping("/{id}/emergency-contacts")
    public ResponseEntity<ApiResponse<StudentDTO>> addEmergencyContact(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        StudentDTO updated = studentService.addEmergencyContact(
                id,
                body.get("contactName"),
                body.get("relationship"),
                body.get("phoneNumber"),
                body.get("address"));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Kontak darurat ditambahkan", updated));
    }

    @DeleteMapping("/{id}/emergency-contacts/{contactId}")
    public ResponseEntity<ApiResponse<Void>> deleteEmergencyContact(
            @PathVariable Long id,
            @PathVariable Long contactId) {
        studentService.deleteEmergencyContact(id, contactId);
        return ResponseEntity.ok(ApiResponse.ok("Kontak darurat dihapus", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> archiveStudent(@PathVariable Long id) {
        studentService.archiveStudent(id);
        return ResponseEntity.ok(ApiResponse.ok("Mahasiswa berhasil diarsipkan", null));
    }
}
