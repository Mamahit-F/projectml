package com.studentinsight.emergency;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/emergency-contacts")
@RequiredArgsConstructor
public class EmergencyContactController {

    private final EmergencyContactRepository emergencyContactRepository;
    private final StudentService studentService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll(
            @RequestParam(required = false) String search) {
        String q = search != null ? search.trim().toLowerCase() : "";

        List<Map<String, Object>> result = emergencyContactRepository.findAll().stream()
                .filter(c -> {
                    if (q.isEmpty()) return true;
                    Student s = c.getStudent();
                    return (c.getContactName() != null && c.getContactName().toLowerCase().contains(q))
                            || (c.getPhoneNumber() != null && c.getPhoneNumber().toLowerCase().contains(q))
                            || (s != null && s.getFullName() != null && s.getFullName().toLowerCase().contains(q))
                            || (s != null && s.getNim() != null && s.getNim().toLowerCase().contains(q));
                })
                .sorted(Comparator.comparingInt((EmergencyContact c) ->
                        c.getStudent() != null && c.getStudent().getLatestSabbathPoints() != null
                                ? c.getStudent().getLatestSabbathPoints() : 0).reversed())
                .map(c -> {
                    Student s = c.getStudent();
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", c.getId());
                    m.put("contactName", c.getContactName());
                    m.put("relationship", c.getRelationship());
                    m.put("phoneNumber", c.getPhoneNumber());
                    m.put("address", c.getAddress());
                    if (s != null) {
                        m.put("studentId", s.getId());
                        m.put("studentNim", s.getNim());
                        m.put("studentName", s.getFullName());
                        m.put("studyProgram", s.getStudyProgram());
                        m.put("latestSabbathPoints", s.getLatestSabbathPoints());
                        m.put("riskCategory", s.getRiskCategory());
                        m.put("currentAddress", s.getCurrentAddress());
                    }
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok("Direktori kontak darurat dimuat", result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Object>> create(@RequestBody Map<String, Object> body) {
        Long studentId = body.get("studentId") != null ? ((Number) body.get("studentId")).longValue() : null;
        if (studentId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("studentId wajib diisi"));
        }
        var updated = studentService.addEmergencyContact(
                studentId,
                (String) body.get("contactName"),
                (String) body.get("relationship"),
                (String) body.get("phoneNumber"),
                (String) body.get("address"));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Kontak darurat ditambahkan", updated));
    }
}
