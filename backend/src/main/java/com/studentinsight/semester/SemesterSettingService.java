package com.studentinsight.semester;

import com.studentinsight.audit.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SemesterSettingService {

    private final SemesterSettingRepository repository;
    private final AuditLogService auditLogService;

    @Transactional
    public SemesterSetting getOrCreateDefault() {
        return repository.findFirstByOrderByIdAsc().orElseGet(() -> {
            SemesterSetting setting = SemesterSetting.builder()
                    .semesterName("Semester Ganjil 2026/2027")
                    .semesterStartDate(LocalDate.of(2026, 8, 17))
                    .attendanceCutoffDate(LocalDate.of(2026, 11, 27))
                    .semesterEndDate(LocalDate.of(2026, 12, 4))
                    .finalPointLimit(null)
                    .attendanceClosed(false)
                    .build();
            return repository.save(setting);
        });
    }

    @Transactional(readOnly = true)
    public Map<String, Object> toResponseMap(SemesterSetting s) {
        LocalDate today = LocalDate.now();
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(s.getSemesterStartDate(), s.getAttendanceCutoffDate()));
        long elapsedDays = Math.max(0, Math.min(totalDays, ChronoUnit.DAYS.between(s.getSemesterStartDate(), today)));
        long daysRemaining = s.isAttendanceClosed() ? 0 : Math.max(0, ChronoUnit.DAYS.between(today, s.getAttendanceCutoffDate()));
        double progressPercent = s.isAttendanceClosed()
                ? 100.0
                : Math.min(100.0, Math.round(((double) elapsedDays / totalDays) * 1000.0) / 10.0);

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId());
        map.put("semesterName", s.getSemesterName());
        map.put("semesterStartDate", s.getSemesterStartDate());
        map.put("attendanceCutoffDate", s.getAttendanceCutoffDate());
        map.put("semesterEndDate", s.getSemesterEndDate());
        map.put("finalPointLimit", s.getFinalPointLimit());
        map.put("attendanceClosed", s.isAttendanceClosed());
        map.put("daysRemainingUntilCutoff", daysRemaining);
        map.put("semesterProgressPercent", progressPercent);
        map.put("updatedAt", s.getUpdatedAt());
        return map;
    }

    @Transactional
    public SemesterSetting updateSettings(SemesterSetting request) {
        SemesterSetting existing = getOrCreateDefault();
        if (request.getSemesterName() != null && !request.getSemesterName().isBlank()) {
            existing.setSemesterName(request.getSemesterName().trim());
        }
        if (request.getSemesterStartDate() != null) {
            existing.setSemesterStartDate(request.getSemesterStartDate());
        }
        if (request.getAttendanceCutoffDate() != null) {
            existing.setAttendanceCutoffDate(request.getAttendanceCutoffDate());
        }
        if (request.getSemesterEndDate() != null) {
            existing.setSemesterEndDate(request.getSemesterEndDate());
        }
        existing.setFinalPointLimit(request.getFinalPointLimit());
        existing.setAttendanceClosed(request.isAttendanceClosed());

        SemesterSetting saved = repository.save(existing);
        auditLogService.log("UPDATE_SEMESTER_SETTINGS", "SemesterSetting", saved.getId(), null,
                "cutoff=" + saved.getAttendanceCutoffDate() + ",closed=" + saved.isAttendanceClosed() + ",limit=" + saved.getFinalPointLimit(),
                "Updated semester configuration");
        return saved;
    }
}
