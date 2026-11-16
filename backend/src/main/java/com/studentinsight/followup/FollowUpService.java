package com.studentinsight.followup;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.followup.dto.CreateFollowUpRequest;
import com.studentinsight.followup.dto.FollowUpDTO;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.user.User;
import com.studentinsight.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowUpService {

    private final FollowUpRecordRepository followUpRepository;
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
    public List<FollowUpDTO> getAllFollowUps() {
        return followUpRepository.findAll().stream()
                .map(FollowUpDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FollowUpDTO> getFollowUpsByStudent(Long studentId) {
        return followUpRepository.findByStudentIdOrderByCounselingDateDesc(studentId).stream()
                .map(FollowUpDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FollowUpDTO getFollowUpById(Long id) {
        return followUpRepository.findById(id)
                .map(FollowUpDTO::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("FollowUpRecord", "id", id));
    }

    @Transactional
    public FollowUpDTO createFollowUp(CreateFollowUpRequest request) {
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getStudentId()));

        User deanUser = getCurrentUser();
        if (deanUser == null) {
            deanUser = userRepository.findByUsername("dean").orElseGet(() -> userRepository.findAll().get(0));
        }

        FollowUpRecord record = FollowUpRecord.builder()
                .student(student)
                .conductedByUser(deanUser)
                .counselingDate(request.getCounselingDate())
                .topicsDiscussed(request.getTopicsDiscussed())
                .actionPlan(request.getActionPlan())
                .status(request.getStatus() != null ? request.getStatus() : "SCHEDULED")
                .evaluationResult(request.getEvaluationResult())
                .build();

        FollowUpRecord saved = followUpRepository.save(record);
        auditLogService.log("CREATE_FOLLOW_UP", "FollowUpRecord", saved.getId(), null, saved.getStatus(),
                "Recorded counseling session for student NIM: " + student.getNim());

        return FollowUpDTO.fromEntity(saved);
    }

    @Transactional
    public FollowUpDTO updateStatus(Long id, String status, String evaluationResult) {
        FollowUpRecord record = followUpRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FollowUpRecord", "id", id));

        String oldStatus = record.getStatus();
        record.setStatus(status);
        if (evaluationResult != null) {
            record.setEvaluationResult(evaluationResult);
        }

        FollowUpRecord updated = followUpRepository.save(record);
        auditLogService.log("UPDATE_FOLLOW_UP", "FollowUpRecord", updated.getId(), oldStatus, status,
                "Updated follow-up status for student NIM: " + record.getStudent().getNim());

        return FollowUpDTO.fromEntity(updated);
    }
}
