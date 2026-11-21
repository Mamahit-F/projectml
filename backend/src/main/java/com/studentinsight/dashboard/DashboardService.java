package com.studentinsight.dashboard;

import com.studentinsight.dashboard.dto.DashboardOverviewDTO;
import com.studentinsight.emergency.EmergencyContactRepository;
import com.studentinsight.followup.FollowUpRecord;
import com.studentinsight.followup.FollowUpRecordRepository;
import com.studentinsight.pdfreport.PdfReport;
import com.studentinsight.pdfreport.PdfReportRepository;
import com.studentinsight.pdfreport.PdfReportService;
import com.studentinsight.prediction.MLPredictionService;
import com.studentinsight.prediction.dto.PredictionSummaryDTO;
import com.studentinsight.semester.SemesterSetting;
import com.studentinsight.semester.SemesterSettingService;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.student.dto.StudentDTO;
import com.studentinsight.welfare.WelfareReport;
import com.studentinsight.welfare.WelfareReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final StudentRepository studentRepository;
    private final PdfReportRepository pdfReportRepository;
    private final PdfReportService pdfReportService;
    private final MLPredictionService predictionService;
    private final SemesterSettingService semesterSettingService;
    private final WelfareReportRepository welfareReportRepository;
    private final FollowUpRecordRepository followUpRepository;
    private final EmergencyContactRepository emergencyContactRepository;

    @Transactional(readOnly = true)
    public DashboardOverviewDTO getOverview() {
        List<Student> allStudents = studentRepository.findByStatus("ACTIVE");
        long totalStudents = allStudents.size();

        List<Integer> points = allStudents.stream()
                .map(s -> s.getLatestSabbathPoints() != null ? s.getLatestSabbathPoints() : 0)
                .sorted()
                .toList();

        long zeroPoint = points.stream().filter(p -> p == 0).count();
        long withPoints = totalStudents - zeroPoint;
        int maxPoints = points.isEmpty() ? 0 : points.get(points.size() - 1);
        double avgPoints = points.isEmpty() ? 0.0
                : Math.round(points.stream().mapToInt(Integer::intValue).average().orElse(0.0) * 10.0) / 10.0;
        double medianPoints = 0.0;
        if (!points.isEmpty()) {
            int mid = points.size() / 2;
            medianPoints = (points.size() % 2 == 1)
                    ? points.get(mid)
                    : Math.round(((points.get(mid - 1) + points.get(mid)) / 2.0) * 10.0) / 10.0;
        }

        // Prodi breakdown
        Map<String, List<Student>> byProdi = allStudents.stream()
                .collect(Collectors.groupingBy(s -> s.getStudyProgram() != null && !s.getStudyProgram().isBlank()
                        ? s.getStudyProgram() : "Umum"));

        List<DashboardOverviewDTO.ProdiStat> prodiBreakdown = byProdi.entrySet().stream()
                .map(e -> {
                    List<Student> list = e.getValue();
                    long total = list.size();
                    long zero = list.stream().filter(s -> (s.getLatestSabbathPoints() == null ? 0 : s.getLatestSabbathPoints()) == 0).count();
                    long high = list.stream().filter(s -> "HIGH".equalsIgnoreCase(s.getRiskCategory())).count();
                    int max = list.stream().mapToInt(s -> s.getLatestSabbathPoints() == null ? 0 : s.getLatestSabbathPoints()).max().orElse(0);
                    double avg = total > 0
                            ? Math.round(list.stream().mapToInt(s -> s.getLatestSabbathPoints() == null ? 0 : s.getLatestSabbathPoints()).average().orElse(0.0) * 10.0) / 10.0
                            : 0.0;
                    return DashboardOverviewDTO.ProdiStat.builder()
                            .studyProgram(e.getKey())
                            .totalStudents(total)
                            .zeroPointStudents(zero)
                            .studentsWithPoints(total - zero)
                            .highRiskCount(high)
                            .avgPoints(avg)
                            .maxPoints(max)
                            .build();
                })
                .sorted(Comparator.comparingLong(DashboardOverviewDTO.ProdiStat::getTotalStudents).reversed())
                .collect(Collectors.toList());

        // Dynamic point distribution buckets based on current maxPoints
        Map<String, Long> pointDist = new LinkedHashMap<>();
        pointDist.put("0 Poin", zeroPoint);
        if (maxPoints <= 40) {
            pointDist.put("1 - 10", countInRange(points, 1, 10));
            pointDist.put("11 - 20", countInRange(points, 11, 20));
            pointDist.put("21 - 30", countInRange(points, 21, 30));
            pointDist.put("> 30", countInRange(points, 31, Integer.MAX_VALUE));
        } else {
            pointDist.put("1 - 30", countInRange(points, 1, 30));
            pointDist.put("31 - 80", countInRange(points, 31, 80));
            pointDist.put("81 - 120", countInRange(points, 81, 120));
            pointDist.put("> 120", countInRange(points, 121, Integer.MAX_VALUE));
        }

        // Snapshot trend across all uploaded PDFs
        List<PdfReport> chronologicalReports = pdfReportRepository.findAllByOrderByReportDateAscCreatedAtAsc();
        List<DashboardOverviewDTO.SnapshotTrendItem> snapshotTrend = chronologicalReports.stream()
                .map(r -> DashboardOverviewDTO.SnapshotTrendItem.builder()
                        .reportId(r.getId())
                        .reportDate(r.getReportDate())
                        .periodLabel(r.getPeriodLabel() != null ? r.getPeriodLabel() : r.getReportDate().toString())
                        .totalStudents(r.getTotalStudents())
                        .studentsWithPoints(r.getStudentsWithPoints())
                        .avgPoints(r.getAvgPoints())
                        .maxPoints(r.getMaxPoints())
                        .build())
                .collect(Collectors.toList());

        Map<String, Object> latestPdfMap = chronologicalReports.isEmpty()
                ? null
                : pdfReportService.toReportMap(chronologicalReports.get(chronologicalReports.size() - 1));

        SemesterSetting semesterSetting = semesterSettingService.getOrCreateDefault();
        PredictionSummaryDTO predictionSummary = predictionService.getSummary();

        long openWelfare = welfareReportRepository.countByStatus("OPEN")
                + welfareReportRepository.countByStatus("IN_REVIEW");
        List<FollowUpRecord> allFollowUps = followUpRepository.findAll();
        long activeFollowUps = allFollowUps.stream()
                .filter(f -> !"COMPLETED".equalsIgnoreCase(f.getStatus()))
                .count();

        // Top priority students sorted by latestSabbathPoints descending
        List<StudentDTO> priorityStudents = allStudents.stream()
                .sorted(Comparator.comparingInt((Student s) -> s.getLatestSabbathPoints() == null ? 0 : s.getLatestSabbathPoints()).reversed())
                .limit(10)
                .map(StudentDTO::fromEntity)
                .collect(Collectors.toList());

        // Recent welfare & follow-up activities for dashboard side card
        List<Map<String, Object>> recentActivities = new ArrayList<>();
        List<WelfareReport> recentWelfare = welfareReportRepository.findAll().stream()
                .sorted(Comparator.comparing(WelfareReport::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(4)
                .toList();
        for (WelfareReport w : recentWelfare) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "W-" + w.getId());
            item.put("type", "WELFARE");
            item.put("studentId", w.getStudent().getId());
            item.put("studentName", w.getStudent().getFullName());
            item.put("subtitle", w.getReportType() + " • " + w.getPriority());
            item.put("status", w.getStatus());
            item.put("createdAt", w.getCreatedAt());
            recentActivities.add(item);
        }
        List<FollowUpRecord> recentFollow = allFollowUps.stream()
                .sorted(Comparator.comparing(FollowUpRecord::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(4)
                .toList();
        for (FollowUpRecord f : recentFollow) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "F-" + f.getId());
            item.put("type", "FOLLOW_UP");
            item.put("studentId", f.getStudent().getId());
            item.put("studentName", f.getStudent().getFullName());
            item.put("subtitle", "Konseling • " + f.getCounselingDate());
            item.put("status", f.getStatus());
            item.put("createdAt", f.getCreatedAt());
            recentActivities.add(item);
        }
        recentActivities.sort((a, b) -> {
            Comparable c1 = (Comparable) a.get("createdAt");
            Comparable c2 = (Comparable) b.get("createdAt");
            if (c1 == null && c2 == null) return 0;
            if (c1 == null) return 1;
            if (c2 == null) return -1;
            return c2.compareTo(c1);
        });
        if (recentActivities.size() > 6) {
            recentActivities = recentActivities.subList(0, 6);
        }

        return DashboardOverviewDTO.builder()
                .totalStudents(totalStudents)
                .zeroPointStudents(zeroPoint)
                .studentsWithPoints(withPoints)
                .maxPoints(maxPoints)
                .avgPoints(avgPoints)
                .medianPoints(medianPoints)
                .totalPdfReports(chronologicalReports.size())
                .openWelfareReports(openWelfare)
                .activeFollowUps(activeFollowUps)
                .emergencyContactsCount(emergencyContactRepository.count())
                .latestPdfReport(latestPdfMap)
                .semesterSetting(semesterSettingService.toResponseMap(semesterSetting))
                .predictionSummary(predictionSummary)
                .prodiBreakdown(prodiBreakdown)
                .pointDistribution(pointDist)
                .snapshotTrend(snapshotTrend)
                .priorityStudents(priorityStudents)
                .recentActivities(recentActivities)
                .build();
    }

    private long countInRange(List<Integer> points, int min, int max) {
        return points.stream().filter(p -> p >= min && p <= max).count();
    }
}
