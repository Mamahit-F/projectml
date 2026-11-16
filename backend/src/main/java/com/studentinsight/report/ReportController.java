package com.studentinsight.report;

import com.studentinsight.attendance.AttendanceRepository;
import com.studentinsight.attendance.dto.AttendanceDTO;
import com.studentinsight.common.ApiResponse;
import com.studentinsight.followup.FollowUpRecordRepository;
import com.studentinsight.followup.dto.FollowUpDTO;
import com.studentinsight.prediction.MLPredictionRepository;
import com.studentinsight.prediction.dto.StudentPredictionDTO;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.student.dto.StudentDTO;
import com.studentinsight.violation.ViolationPointRepository;
import com.studentinsight.violation.dto.ViolationPointDTO;
import com.studentinsight.welfare.WelfareReportRepository;
import com.studentinsight.welfare.dto.WelfareReportDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final StudentRepository studentRepository;
    private final AttendanceRepository attendanceRepository;
    private final ViolationPointRepository violationPointRepository;
    private final WelfareReportRepository welfareReportRepository;
    private final FollowUpRecordRepository followUpRepository;
    private final MLPredictionRepository mlPredictionRepository;

    @GetMapping("/comprehensive")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getComprehensiveReport(
            @RequestParam(required = false) Long residenceCategoryId) {

        Map<String, Object> report = new HashMap<>();

        List<Student> students = (residenceCategoryId != null) ?
                studentRepository.findByResidenceCategoryId(residenceCategoryId) : studentRepository.findAll();

        List<StudentDTO> studentDTOs = students.stream().map(StudentDTO::fromEntity).collect(Collectors.toList());
        report.put("students", studentDTOs);
        report.put("totalStudents", students.size());

        List<AttendanceDTO> attendances = attendanceRepository.findAll().stream()
                .filter(a -> residenceCategoryId == null ||
                        (a.getStudent().getResidenceCategory() != null && a.getStudent().getResidenceCategory().getId().equals(residenceCategoryId)))
                .map(AttendanceDTO::fromEntity)
                .collect(Collectors.toList());
        report.put("attendances", attendances);

        List<ViolationPointDTO> violations = violationPointRepository.findAll().stream()
                .filter(v -> residenceCategoryId == null ||
                        (v.getStudent().getResidenceCategory() != null && v.getStudent().getResidenceCategory().getId().equals(residenceCategoryId)))
                .map(ViolationPointDTO::fromEntity)
                .collect(Collectors.toList());
        report.put("violations", violations);

        List<WelfareReportDTO> welfareReports = welfareReportRepository.findAll().stream()
                .filter(w -> residenceCategoryId == null ||
                        (w.getStudent().getResidenceCategory() != null && w.getStudent().getResidenceCategory().getId().equals(residenceCategoryId)))
                .map(WelfareReportDTO::fromEntity)
                .collect(Collectors.toList());
        report.put("welfareReports", welfareReports);

        List<FollowUpDTO> followUps = followUpRepository.findAll().stream()
                .filter(f -> residenceCategoryId == null ||
                        (f.getStudent().getResidenceCategory() != null && f.getStudent().getResidenceCategory().getId().equals(residenceCategoryId)))
                .map(FollowUpDTO::fromEntity)
                .collect(Collectors.toList());
        report.put("followUps", followUps);

        List<StudentPredictionDTO> predictions = mlPredictionRepository.findLatestPredictionsForAllStudents().stream()
                .filter(p -> residenceCategoryId == null ||
                        (p.getStudent().getResidenceCategory() != null && p.getStudent().getResidenceCategory().getId().equals(residenceCategoryId)))
                .map(StudentPredictionDTO::fromEntity)
                .collect(Collectors.toList());
        report.put("predictions", predictions);

        return ResponseEntity.ok(ApiResponse.ok("Comprehensive report generated successfully", report));
    }
}
