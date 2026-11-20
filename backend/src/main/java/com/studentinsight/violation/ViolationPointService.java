package com.studentinsight.violation;

import com.studentinsight.attendance.Attendance;
import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.BadRequestException;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.event.WorshipEvent;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.user.User;
import com.studentinsight.user.UserRepository;
import com.studentinsight.violation.dto.ManualPointAdjustmentRequest;
import com.studentinsight.violation.dto.ViolationPointDTO;
import com.studentinsight.violation.dto.ViolationPointRuleDTO;
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
public class ViolationPointService {

    private final ViolationPointRepository violationPointRepository;
    private final ViolationPointRuleRepository ruleRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<ViolationPointDTO> getAllViolations(Long studentId, Pageable pageable) {
        Page<ViolationPoint> page = (studentId != null)
                ? violationPointRepository.findByStudentIdOrderByCreatedAtDesc(studentId, pageable)
                : violationPointRepository.findAllByOrderByCreatedAtDesc(pageable);
        return page.map(ViolationPointDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<ViolationPointDTO> getStudentViolations(Long studentId) {
        return violationPointRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(ViolationPointDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ViolationPointRuleDTO> getAllRules() {
        return ruleRepository.findAll().stream()
                .map(ViolationPointRuleDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public ViolationPoint recordAbsenceViolation(Student student, WorshipEvent event, Attendance attendance, int points, String reason) {
        // Prevent duplicate penalty for same attendance
        if (attendance != null && violationPointRepository.findByAttendanceId(attendance.getId()).isPresent()) {
            return violationPointRepository.findByAttendanceId(attendance.getId()).get();
        }

        ViolationPoint vp = ViolationPoint.builder()
                .student(student)
                .worshipEvent(event)
                .attendance(attendance)
                .points(points)
                .reason(reason)
                .status("ACTIVE")
                .build();

        ViolationPoint saved = violationPointRepository.save(vp);

        // Update student cached total points
        student.setTotalViolationPoints(Math.max(0, student.getTotalViolationPoints() + points));
        studentRepository.save(student);

        auditLogService.log("RECORD_VIOLATION_POINTS", "ViolationPoint", saved.getId(),
                null, String.valueOf(points), "Added " + points + " points to student NIM: " + student.getNim() + " for " + reason);

        return saved;
    }

    @Transactional
    public ViolationPointDTO manualPointAdjustment(ManualPointAdjustmentRequest request) {
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getStudentId()));

        User currentUser = null;
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
                currentUser = userRepository.findByUsername(auth.getName()).orElse(null);
            }
        } catch (Exception ignored) {
        }

        int previousTotal = student.getTotalViolationPoints();
        int newTotal = Math.max(0, previousTotal + request.getPoints());
        student.setTotalViolationPoints(newTotal);
        studentRepository.save(student);

        ViolationPoint vp = ViolationPoint.builder()
                .student(student)
                .points(request.getPoints())
                .reason(request.getReason())
                .status("ACTIVE")
                .adjustedByUser(currentUser)
                .adjustmentNotes(request.getAdjustmentNotes())
                .build();

        ViolationPoint saved = violationPointRepository.save(vp);

        auditLogService.log("MANUAL_POINT_ADJUSTMENT", "ViolationPoint", saved.getId(),
                "total=" + previousTotal, "total=" + newTotal,
                "Manual adjustment of " + request.getPoints() + " points for " + student.getNim() + ". Reason: " + request.getReason());

        return ViolationPointDTO.fromEntity(saved);
    }

    @Transactional
    public ViolationPointDTO cancelViolation(Long id, String cancelReason) {
        ViolationPoint vp = violationPointRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ViolationPoint", "id", id));

        if ("CANCELLED".equals(vp.getStatus())) {
            throw new BadRequestException("This violation has already been cancelled");
        }

        Student student = vp.getStudent();
        student.setTotalViolationPoints(Math.max(0, student.getTotalViolationPoints() - vp.getPoints()));
        studentRepository.save(student);

        vp.setStatus("CANCELLED");
        vp.setAdjustmentNotes(cancelReason);

        ViolationPoint saved = violationPointRepository.save(vp);
        auditLogService.log("CANCEL_VIOLATION", "ViolationPoint", saved.getId(),
                "ACTIVE", "CANCELLED", "Cancelled violation of " + vp.getPoints() + " points for student NIM: " + student.getNim());

        return ViolationPointDTO.fromEntity(saved);
    }
}
