package com.studentinsight.welfare;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.user.User;
import com.studentinsight.user.UserRepository;
import com.studentinsight.welfare.dto.CreateWelfareReportRequest;
import com.studentinsight.welfare.dto.UpdateWelfareReportRequest;
import com.studentinsight.welfare.dto.WelfareReportDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WelfareReportService {

    private final WelfareReportRepository reportRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    private User getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
                return userRepository.findByUsername(auth.getName()).orElse(null);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Transactional(readOnly = true)
    public Page<WelfareReportDTO> searchReports(String status, String priority, String reportType, Pageable pageable) {
        return reportRepository.searchReports(status, priority, reportType, pageable)
                .map(WelfareReportDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<WelfareReportDTO> getReportsByStudent(Long studentId) {
        return reportRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(WelfareReportDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WelfareReportDTO getReportById(Long id) {
        return reportRepository.findById(id)
                .map(WelfareReportDTO::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("WelfareReport", "id", id));
    }

    @Transactional
    public WelfareReportDTO createReport(CreateWelfareReportRequest request) {
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getStudentId()));

        User assignedTo = null;
        if (request.getAssignedToUserId() != null) {
            assignedTo = userRepository.findById(request.getAssignedToUserId()).orElse(null);
        }

        WelfareReport report = WelfareReport.builder()
                .student(student)
                .reportType(request.getReportType())
                .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                .status("OPEN")
                .description(request.getDescription())
                .reportedByUser(getCurrentUser())
                .assignedToUser(assignedTo)
                .build();

        WelfareReport saved = reportRepository.save(report);
        auditLogService.log("CREATE_WELFARE_REPORT", "WelfareReport", saved.getId(), null, saved.getStatus(),
                "Created " + saved.getReportType() + " report for student NIM: " + student.getNim());

        return WelfareReportDTO.fromEntity(saved);
    }

    @Transactional
    public WelfareReportDTO updateReport(Long id, UpdateWelfareReportRequest request) {
        WelfareReport report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WelfareReport", "id", id));

        String oldStatus = report.getStatus();
        report.setStatus(request.getStatus());

        if (request.getPriority() != null) {
            report.setPriority(request.getPriority());
        }
        if (request.getAssignedToUserId() != null) {
            User assignedTo = userRepository.findById(request.getAssignedToUserId()).orElse(null);
            report.setAssignedToUser(assignedTo);
        }
        if (request.getResolutionNotes() != null) {
            report.setResolutionNotes(request.getResolutionNotes());
        }

        WelfareReport updated = reportRepository.save(report);
        auditLogService.log("UPDATE_WELFARE_REPORT", "WelfareReport", updated.getId(), oldStatus, updated.getStatus(),
                "Updated welfare report status to " + updated.getStatus());

        return WelfareReportDTO.fromEntity(updated);
    }
}
