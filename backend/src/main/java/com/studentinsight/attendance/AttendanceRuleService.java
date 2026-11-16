package com.studentinsight.attendance;

import com.studentinsight.attendance.dto.AttendanceRuleDTO;
import com.studentinsight.attendance.dto.UpdateAttendanceRuleRequest;
import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.event.EventType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceRuleService {

    private final AttendanceRuleRepository ruleRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<AttendanceRuleDTO> getAllRules() {
        return ruleRepository.findAll().stream()
                .map(AttendanceRuleDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttendanceRuleDTO> getRulesByCategory(Long categoryId) {
        return ruleRepository.findByResidenceCategoryId(categoryId).stream()
                .map(AttendanceRuleDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean isMandatory(Long categoryId, EventType eventType) {
        return ruleRepository.findByResidenceCategoryIdAndEventType(categoryId, eventType)
                .map(AttendanceRule::isMandatory)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public Integer getPenaltyWeight(Long categoryId, EventType eventType) {
        return ruleRepository.findByResidenceCategoryIdAndEventType(categoryId, eventType)
                .map(AttendanceRule::getPointPenaltyWeight)
                .orElse(5);
    }

    @Transactional
    public AttendanceRuleDTO updateRule(Long id, UpdateAttendanceRuleRequest request) {
        AttendanceRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceRule", "id", id));

        boolean oldMandatory = rule.isMandatory();
        int oldPoints = rule.getPointPenaltyWeight();

        rule.setMandatory(request.getMandatory());
        rule.setPointPenaltyWeight(request.getPointPenaltyWeight());
        if (request.getNotes() != null) rule.setNotes(request.getNotes());
        if (request.getActive() != null) rule.setActive(request.getActive());

        AttendanceRule saved = ruleRepository.save(rule);
        auditLogService.log("UPDATE_ATTENDANCE_RULE", "AttendanceRule", saved.getId(),
                "mandatory=" + oldMandatory + ", pts=" + oldPoints,
                "mandatory=" + saved.isMandatory() + ", pts=" + saved.getPointPenaltyWeight(),
                "Updated attendance rule for category: " + saved.getResidenceCategory().getCode() + " on " + saved.getEventType());

        return AttendanceRuleDTO.fromEntity(saved);
    }
}
