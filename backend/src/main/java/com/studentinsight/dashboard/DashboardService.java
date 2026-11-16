package com.studentinsight.dashboard;

import com.studentinsight.attendance.AttendanceRepository;
import com.studentinsight.attendance.AttendanceStatus;
import com.studentinsight.dashboard.dto.DashboardOverviewDTO;
import com.studentinsight.event.EventStatus;
import com.studentinsight.event.WorshipEventRepository;
import com.studentinsight.prediction.MLPredictionService;
import com.studentinsight.prediction.dto.PredictionSummaryDTO;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.student.dto.StudentDTO;
import com.studentinsight.violation.ViolationPointRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final StudentRepository studentRepository;
    private final WorshipEventRepository worshipEventRepository;
    private final AttendanceRepository attendanceRepository;
    private final ViolationPointRepository violationPointRepository;
    private final MLPredictionService predictionService;

    @Transactional(readOnly = true)
    public DashboardOverviewDTO getOverview() {
        List<Student> allStudents = studentRepository.findAll();
        long totalStudents = allStudents.size();

        long outsiderDekat = allStudents.stream()
                .filter(s -> s.getResidenceCategory() != null && "OUTSIDER_DEKAT".equalsIgnoreCase(s.getResidenceCategory().getCode()))
                .count();

        long outsiderJauh = allStudents.stream()
                .filter(s -> s.getResidenceCategory() != null && "OUTSIDER_JAUH".equalsIgnoreCase(s.getResidenceCategory().getCode()))
                .count();

        long totalEvents = worshipEventRepository.count();
        long ongoingEvents = worshipEventRepository.countByStatus(EventStatus.ONGOING);
        long completedEvents = worshipEventRepository.countByStatus(EventStatus.COMPLETED);

        long presentCount = attendanceRepository.countByStatus(AttendanceStatus.PRESENT);
        long absentCount = attendanceRepository.countByStatus(AttendanceStatus.ABSENT);
        long excusedCount = attendanceRepository.countByStatus(AttendanceStatus.EXCUSED);
        long sickCount = attendanceRepository.countByStatus(AttendanceStatus.SICK);
        long totalAttendances = attendanceRepository.count();

        long validConsidered = presentCount + absentCount;
        double overallAttendanceRate = validConsidered > 0 ?
                Math.round(((double) presentCount / validConsidered) * 1000.0) / 10.0 : 0.0;

        long studentsWithViolations = allStudents.stream().filter(s -> s.getTotalViolationPoints() > 0).count();
        long totalActiveViolationPoints = allStudents.stream().mapToLong(Student::getTotalViolationPoints).sum();

        // Violation point distribution
        Map<String, Long> violationDistribution = new LinkedHashMap<>();
        violationDistribution.put("0 pts", allStudents.stream().filter(s -> s.getTotalViolationPoints() == 0).count());
        violationDistribution.put("1 - 5 pts", allStudents.stream().filter(s -> s.getTotalViolationPoints() >= 1 && s.getTotalViolationPoints() <= 5).count());
        violationDistribution.put("6 - 15 pts", allStudents.stream().filter(s -> s.getTotalViolationPoints() >= 6 && s.getTotalViolationPoints() <= 15).count());
        violationDistribution.put("16 - 30 pts", allStudents.stream().filter(s -> s.getTotalViolationPoints() >= 16 && s.getTotalViolationPoints() <= 30).count());
        violationDistribution.put("> 30 pts", allStudents.stream().filter(s -> s.getTotalViolationPoints() > 30).count());

        PredictionSummaryDTO predictionSummary = predictionService.getSummary();

        // Students needing evaluation (e.g. points > 10, or in probation, or top violation points)
        List<StudentDTO> studentsNeedingEvaluation = allStudents.stream()
                .filter(s -> s.getTotalViolationPoints() >= 10 || "PROBATION".equalsIgnoreCase(s.getStatus()))
                .sorted(Comparator.comparingInt(Student::getTotalViolationPoints).reversed())
                .limit(10)
                .map(StudentDTO::fromEntity)
                .collect(Collectors.toList());

        return DashboardOverviewDTO.builder()
                .totalStudents(totalStudents)
                .outsiderDekatCount(outsiderDekat)
                .outsiderJauhCount(outsiderJauh)
                .totalWorshipEvents(totalEvents)
                .ongoingEvents(ongoingEvents)
                .completedEvents(completedEvents)
                .totalAttendances(totalAttendances)
                .presentCount(presentCount)
                .absentCount(absentCount)
                .excusedCount(excusedCount)
                .sickCount(sickCount)
                .overallAttendanceRate(overallAttendanceRate)
                .studentsWithViolations(studentsWithViolations)
                .totalActiveViolationPoints(totalActiveViolationPoints)
                .violationDistribution(violationDistribution)
                .predictionSummary(predictionSummary)
                .studentsNeedingEvaluation(studentsNeedingEvaluation)
                .build();
    }
}
