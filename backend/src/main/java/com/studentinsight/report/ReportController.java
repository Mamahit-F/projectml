package com.studentinsight.report;

import com.studentinsight.attendance.Attendance;
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
import com.studentinsight.violation.ViolationPoint;
import com.studentinsight.violation.ViolationPointRepository;
import com.studentinsight.violation.dto.ViolationPointDTO;
import com.studentinsight.welfare.WelfareReportRepository;
import com.studentinsight.welfare.dto.WelfareReportDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
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
    @Transactional(readOnly = true)
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

    @GetMapping("/attendance")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportAttendanceCsv(
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<Attendance> list = (eventId != null)
                ? attendanceRepository.findByWorshipEventId(eventId)
                : attendanceRepository.findAll();

        StringBuilder sb = new StringBuilder();
        sb.append("ID,NIM,Nama Mahasiswa,Kategori,Kegiatan Ibadah,Tanggal,Status,Metode,Waktu Check-In,Catatan\n");

        for (Attendance a : list) {
            LocalDate eventDate = a.getWorshipEvent() != null ? a.getWorshipEvent().getEventDate() : null;
            if (startDate != null && (eventDate == null || eventDate.isBefore(startDate))) continue;
            if (endDate != null && (eventDate == null || eventDate.isAfter(endDate))) continue;

            sb.append(a.getId()).append(',')
              .append(csv(a.getStudent() != null ? a.getStudent().getNim() : "")).append(',')
              .append(csv(a.getStudent() != null ? a.getStudent().getFullName() : "")).append(',')
              .append(csv(a.getStudent() != null && a.getStudent().getResidenceCategory() != null ? a.getStudent().getResidenceCategory().getName() : "")).append(',')
              .append(csv(a.getWorshipEvent() != null ? a.getWorshipEvent().getTitle() : "")).append(',')
              .append(csv(eventDate != null ? eventDate.toString() : "")).append(',')
              .append(csv(a.getStatus() != null ? a.getStatus().name() : "")).append(',')
              .append(csv(a.getRecordedMethod() != null ? a.getRecordedMethod().name() : "")).append(',')
              .append(csv(a.getCheckInTime() != null ? a.getCheckInTime().toString() : "")).append(',')
              .append(csv(a.getNotes())).append('\n');
        }
        return csvResponse("laporan_presensi.csv", sb.toString());
    }

    @GetMapping("/violations")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportViolationsCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<ViolationPoint> list = violationPointRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("ID,Tanggal,NIM,Nama Mahasiswa,Kegiatan,Poin,Alasan,Status,Penyesuai,Catatan\n");

        for (ViolationPoint v : list) {
            LocalDate created = v.getCreatedAt() != null
                    ? v.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate()
                    : null;
            if (startDate != null && (created == null || created.isBefore(startDate))) continue;
            if (endDate != null && (created == null || created.isAfter(endDate))) continue;

            sb.append(v.getId()).append(',')
              .append(csv(created != null ? created.toString() : "")).append(',')
              .append(csv(v.getStudent() != null ? v.getStudent().getNim() : "")).append(',')
              .append(csv(v.getStudent() != null ? v.getStudent().getFullName() : "")).append(',')
              .append(csv(v.getWorshipEvent() != null ? v.getWorshipEvent().getTitle() : "Penyesuaian Manual")).append(',')
              .append(v.getPoints()).append(',')
              .append(csv(v.getReason())).append(',')
              .append(csv(v.getStatus())).append(',')
              .append(csv(v.getAdjustedByUser() != null ? v.getAdjustedByUser().getFullName() : "")).append(',')
              .append(csv(v.getAdjustmentNotes())).append('\n');
        }
        return csvResponse("laporan_pelanggaran.csv", sb.toString());
    }

    @GetMapping("/students")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportStudentsCsv() {
        List<Student> list = studentRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("ID,NIM,Nama Lengkap,Program Studi,Fakultas,Kategori,Alamat,No HP,Total Poin,Status,QR Token\n");

        for (Student s : list) {
            sb.append(s.getId()).append(',')
              .append(csv(s.getNim())).append(',')
              .append(csv(s.getFullName())).append(',')
              .append(csv(s.getStudyProgram())).append(',')
              .append(csv(s.getFaculty())).append(',')
              .append(csv(s.getResidenceCategory() != null ? s.getResidenceCategory().getName() : "")).append(',')
              .append(csv(s.getCurrentAddress())).append(',')
              .append(csv(s.getPhoneNumber())).append(',')
              .append(s.getTotalViolationPoints()).append(',')
              .append(csv(s.getStatus())).append(',')
              .append(csv(s.getQrToken())).append('\n');
        }
        return csvResponse("laporan_mahasiswa.csv", sb.toString());
    }

    private ResponseEntity<byte[]> csvResponse(String filename, String content) {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    private String csv(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
