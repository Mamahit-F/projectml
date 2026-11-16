package com.studentinsight.attendance;

import com.studentinsight.attendance.dto.*;
import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.BadRequestException;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.event.EventStatus;
import com.studentinsight.event.WorshipEvent;
import com.studentinsight.event.WorshipEventRepository;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.user.User;
import com.studentinsight.user.UserRepository;
import com.studentinsight.violation.ViolationPoint;
import com.studentinsight.violation.ViolationPointRepository;
import com.studentinsight.violation.ViolationPointService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final WorshipEventRepository worshipEventRepository;
    private final StudentRepository studentRepository;
    private final AttendanceRuleService attendanceRuleService;
    private final ViolationPointService violationPointService;
    private final ViolationPointRepository violationPointRepository;
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
    public Page<AttendanceDTO> searchAttendances(Long worshipEventId, Long studentId, AttendanceStatus status, Pageable pageable) {
        return attendanceRepository.searchAttendances(worshipEventId, studentId, status, pageable)
                .map(AttendanceDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getAttendancesByEvent(Long eventId) {
        return attendanceRepository.findByWorshipEventId(eventId).stream()
                .map(AttendanceDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getAttendancesByStudent(Long studentId) {
        return attendanceRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(AttendanceDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public AttendanceDTO recordQrScan(ScanQrRequest request) {
        Student student = studentRepository.findByQrToken(request.getQrToken().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Student with specified QR code not found"));

        if (!"ACTIVE".equalsIgnoreCase(student.getStatus())) {
            throw new BadRequestException("Mahasiswa ini berstatus: " + student.getStatus() + ", tidak dapat presensi.");
        }

        WorshipEvent event = worshipEventRepository.findById(request.getWorshipEventId())
                .orElseThrow(() -> new ResourceNotFoundException("WorshipEvent", "id", request.getWorshipEventId()));

        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new BadRequestException("Kegiatan ibadah ini telah dibatalkan.");
        }

        Optional<Attendance> existing = attendanceRepository.findByStudentIdAndWorshipEventId(student.getId(), event.getId());
        if (existing.isPresent()) {
            Attendance att = existing.get();
            if (att.getStatus() == AttendanceStatus.PRESENT) {
                throw new BadRequestException("Mahasiswa " + student.getFullName() + " (" + student.getNim() + ") SUDAH tercatat hadir sebelumnya.");
            }
            // Update to PRESENT if it was pending or absent
            att.setStatus(AttendanceStatus.PRESENT);
            att.setRecordedMethod(AttendanceMethod.QR_SCAN);
            att.setCheckInTime(Instant.now());
            att.setVerifiedByUser(getCurrentUser());
            att.setNotes("Check-in via scan QR");
            Attendance saved = attendanceRepository.save(att);
            return AttendanceDTO.fromEntity(saved);
        }

        Attendance attendance = Attendance.builder()
                .student(student)
                .worshipEvent(event)
                .status(AttendanceStatus.PRESENT)
                .recordedMethod(AttendanceMethod.QR_SCAN)
                .checkInTime(Instant.now())
                .verifiedByUser(getCurrentUser())
                .notes("Check-in via scan QR")
                .build();

        Attendance saved = attendanceRepository.save(attendance);
        auditLogService.log("QR_SCAN_ATTENDANCE", "Attendance", saved.getId(), null, "PRESENT",
                "Recorded QR attendance for " + student.getNim() + " on event: " + event.getTitle());

        return AttendanceDTO.fromEntity(saved);
    }

    @Transactional
    public AttendanceDTO recordManual(ManualAttendanceRequest request) {
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getStudentId()));

        WorshipEvent event = worshipEventRepository.findById(request.getWorshipEventId())
                .orElseThrow(() -> new ResourceNotFoundException("WorshipEvent", "id", request.getWorshipEventId()));

        Optional<Attendance> existing = attendanceRepository.findByStudentIdAndWorshipEventId(student.getId(), event.getId());
        Attendance attendance;
        if (existing.isPresent()) {
            attendance = existing.get();
            attendance.setStatus(request.getStatus());
            attendance.setNotes(request.getNotes());
            attendance.setVerifiedByUser(getCurrentUser());
        } else {
            attendance = Attendance.builder()
                    .student(student)
                    .worshipEvent(event)
                    .status(request.getStatus())
                    .recordedMethod(AttendanceMethod.MANUAL_INPUT)
                    .checkInTime(request.getStatus() == AttendanceStatus.PRESENT ? Instant.now() : null)
                    .verifiedByUser(getCurrentUser())
                    .notes(request.getNotes())
                    .build();
        }

        Attendance saved = attendanceRepository.save(attendance);

        // Check if absent on mandatory event -> create violation point
        boolean isMandatory = attendanceRuleService.isMandatory(student.getResidenceCategory().getId(), event.getEventType());
        if (request.getStatus() == AttendanceStatus.ABSENT && isMandatory && event.getStatus() != EventStatus.CANCELLED) {
            int penalty = attendanceRuleService.getPenaltyWeight(student.getResidenceCategory().getId(), event.getEventType());
            violationPointService.recordAbsenceViolation(student, event, saved, penalty,
                    "Alpa manual pada kegiatan: " + event.getTitle());
        }

        auditLogService.log("MANUAL_ATTENDANCE", "Attendance", saved.getId(), null, saved.getStatus().name(),
                "Manual attendance for " + student.getNim() + " on " + event.getTitle());

        return AttendanceDTO.fromEntity(saved);
    }

    @Transactional
    public AttendanceDTO updateAttendance(Long id, UpdateAttendanceRequest request) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", "id", id));

        AttendanceStatus oldStatus = attendance.getStatus();
        AttendanceStatus newStatus = request.getStatus();

        attendance.setStatus(newStatus);
        attendance.setNotes(request.getNotes());
        attendance.setVerifiedByUser(getCurrentUser());
        Attendance updated = attendanceRepository.save(attendance);

        // If changed from ABSENT to EXCUSED/SICK, cancel any related violation points
        if (oldStatus == AttendanceStatus.ABSENT && (newStatus == AttendanceStatus.EXCUSED || newStatus == AttendanceStatus.SICK || newStatus == AttendanceStatus.PRESENT)) {
            Optional<ViolationPoint> vpOpt = violationPointRepository.findByAttendanceId(attendance.getId());
            vpOpt.ifPresent(vp -> violationPointService.cancelViolation(vp.getId(), "Status diubah menjadi " + newStatus + ": " + request.getNotes()));
        } else if (oldStatus != AttendanceStatus.ABSENT && newStatus == AttendanceStatus.ABSENT) {
            Student student = attendance.getStudent();
            WorshipEvent event = attendance.getWorshipEvent();
            boolean isMandatory = attendanceRuleService.isMandatory(student.getResidenceCategory().getId(), event.getEventType());
            if (isMandatory && event.getStatus() != EventStatus.CANCELLED) {
                int penalty = attendanceRuleService.getPenaltyWeight(student.getResidenceCategory().getId(), event.getEventType());
                violationPointService.recordAbsenceViolation(student, event, updated, penalty,
                        "Koreksi status kehadiran menjadi ABSENT pada: " + event.getTitle());
            }
        }

        auditLogService.log("CORRECT_ATTENDANCE", "Attendance", updated.getId(),
                oldStatus.name(), newStatus.name(), "Koreksi kehadiran untuk " + attendance.getStudent().getNim() + ": " + request.getNotes());

        return AttendanceDTO.fromEntity(updated);
    }

    @Transactional
    public void finalizeEventAttendances(Long eventId) {
        WorshipEvent event = worshipEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("WorshipEvent", "id", eventId));

        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new BadRequestException("Kegiatan yang dibatalkan tidak dapat difinalisasi.");
        }

        List<Student> activeStudents = studentRepository.findByStatus("ACTIVE");

        for (Student student : activeStudents) {
            boolean isMandatory = attendanceRuleService.isMandatory(student.getResidenceCategory().getId(), event.getEventType());

            if (!isMandatory) {
                // Not mandatory for this residence category, skip
                continue;
            }

            Optional<Attendance> attOpt = attendanceRepository.findByStudentIdAndWorshipEventId(student.getId(), event.getId());
            if (attOpt.isEmpty()) {
                // Student was obligated to attend but didn't show up -> Mark ABSENT and generate violation point
                Attendance absentAtt = Attendance.builder()
                        .student(student)
                        .worshipEvent(event)
                        .status(AttendanceStatus.ABSENT)
                        .recordedMethod(AttendanceMethod.MANUAL_INPUT)
                        .verifiedByUser(getCurrentUser())
                        .notes("Otomatis dicatat Alpa saat finalisasi kegiatan")
                        .build();
                Attendance savedAtt = attendanceRepository.save(absentAtt);

                int penalty = attendanceRuleService.getPenaltyWeight(student.getResidenceCategory().getId(), event.getEventType());
                violationPointService.recordAbsenceViolation(student, event, savedAtt, penalty,
                        "Tidak hadir pada kewajiban ibadah: " + event.getTitle());
            }
        }

        event.setStatus(EventStatus.COMPLETED);
        worshipEventRepository.save(event);

        auditLogService.log("FINALIZE_EVENT", "WorshipEvent", eventId,
                "ONGOING", "COMPLETED", "Finalized attendance and calculated violation points for: " + event.getTitle());
    }
}
