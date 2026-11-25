package com.studentinsight;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.pdfreport.PdfReport;
import com.studentinsight.pdfreport.PdfReportRepository;
import com.studentinsight.pdfreport.PdfReportService;
import com.studentinsight.pdfreport.StudentPointRecord;
import com.studentinsight.pdfreport.StudentPointRecordRepository;
import com.studentinsight.prediction.MLPredictionRepository;
import com.studentinsight.prediction.MLPredictionService;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PdfReportSyncTest {

    @Mock
    private PdfReportRepository pdfReportRepository;

    @Mock
    private StudentPointRecordRepository pointRecordRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MLPredictionService predictionService;

    @Mock
    private MLPredictionRepository predictionRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private PdfReportService pdfReportService;

    @Test
    void deleteReport_DeletesExclusiveStudentsAndRecalculatesSharedStudents() {
        PdfReport reportNov = PdfReport.builder()
                .id(2L)
                .fileName("nov_2026.pdf")
                .facultyName("Fakultas Ilmu Komputer")
                .reportDate(LocalDate.of(2026, 11, 6))
                .build();

        PdfReport reportOct = PdfReport.builder()
                .id(1L)
                .fileName("oct_2026.pdf")
                .facultyName("Fakultas Ilmu Komputer")
                .reportDate(LocalDate.of(2026, 10, 1))
                .build();

        // Student 100 ONLY existed in reportNov -> MUST be deleted
        // Student 200 existed in BOTH reportOct (40 pts) and reportNov (120 pts) -> MUST stay and roll back to 40 pts
        Student sharedStudent = Student.builder()
                .id(200L)
                .nim("12510613")
                .fullName("Kenneth Haliman")
                .studyProgram("Informatika")
                .faculty("Fakultas Ilmu Komputer")
                .latestSabbathPoints(120)
                .previousSabbathPoints(40)
                .pointsDelta(80)
                .totalViolationPoints(120)
                .riskCategory("HIGH")
                .build();

        StudentPointRecord octRec = StudentPointRecord.builder()
                .id(11L)
                .pdfReport(reportOct)
                .student(sharedStudent)
                .sabbathPoints(40)
                .pointsDelta(0)
                .riskCategory("MEDIUM")
                .projectedEndPoints(65.0)
                .build();

        when(pdfReportRepository.findById(2L)).thenReturn(Optional.of(reportNov));
        when(pointRecordRepository.findDistinctStudentIdsByPdfReportId(2L)).thenReturn(List.of(100L, 200L));
        when(pointRecordRepository.findHistoryByStudentIdIn(List.of(100L, 200L))).thenReturn(List.of(octRec));
        when(studentRepository.findAllById(List.of(200L))).thenReturn(List.of(sharedStudent));
        when(pdfReportRepository.findFirstByOrderByReportDateDescCreatedAtDesc()).thenReturn(Optional.of(reportOct));
        when(pdfReportRepository.count()).thenReturn(1L);
        when(studentRepository.countByStatus("ACTIVE")).thenReturn(1L);

        Map<String, Object> summary = pdfReportService.deleteReport(2L);

        assertEquals(1, summary.get("deletedStudentsCount"));
        assertEquals(1, summary.get("recalculatedStudentsCount"));
        assertEquals(1L, summary.get("remainingReportsCount"));

        // Verify exclusive student 100 was deleted in bulk, while shared student 200 was NOT deleted
        verify(studentRepository, times(1)).deleteByIdInBulk(List.of(100L));
        verify(predictionRepository, times(1)).deleteByPdfReportId(2L);
        verify(predictionRepository, times(1)).deleteByStudentIdIn(List.of(100L));

        // Verify shared student 200 rolled back accurately to Oct report values
        assertEquals(40, sharedStudent.getLatestSabbathPoints());
        assertNull(sharedStudent.getPreviousSabbathPoints());
        assertEquals(0, sharedStudent.getPointsDelta());
        assertEquals(40, sharedStudent.getTotalViolationPoints());
        assertEquals("MEDIUM", sharedStudent.getRiskCategory());

        // Verify risk re-analysis triggered on remaining report
        verify(predictionService, times(1)).analyzeAllActiveStudents(reportOct);
    }

    @Test
    void syncStudentsWithPdfArchives_RemovesAllOrphansWhenZeroReportsExist() {
        Student orphan1 = Student.builder().id(10L).nim("S1").fullName("Orphan One").build();
        Student orphan2 = Student.builder().id(20L).nim("S2").fullName("Orphan Two").build();

        when(pointRecordRepository.findAllStudentIdsWithRecords()).thenReturn(List.of());
        when(studentRepository.findAll()).thenReturn(List.of(orphan1, orphan2));
        when(pdfReportRepository.findFirstByOrderByReportDateDescCreatedAtDesc()).thenReturn(Optional.empty());
        when(pdfReportRepository.count()).thenReturn(0L);

        Map<String, Object> res = pdfReportService.syncStudentsWithPdfArchives();

        assertEquals(2, res.get("removedOrphanStudentsCount"));
        assertEquals(0, res.get("syncedStudentsCount"));
        verify(predictionRepository, times(1)).deleteByStudentIdIn(List.of(10L, 20L));
        verify(studentRepository, times(1)).deleteByIdInBulk(List.of(10L, 20L));
        verify(predictionRepository, times(1)).deleteAllInBulk();
    }

    @Test
    void deleteReport_WhenLastReportDeleted_ClearsAllStudentsAndPredictions() {
        PdfReport onlyReport = PdfReport.builder()
                .id(5L)
                .fileName("only_report.pdf")
                .facultyName("Fakultas Pertanian")
                .reportDate(LocalDate.of(2026, 11, 25))
                .build();

        when(pdfReportRepository.findById(5L)).thenReturn(Optional.of(onlyReport));
        when(pointRecordRepository.findDistinctStudentIdsByPdfReportId(5L)).thenReturn(List.of(301L, 302L));
        when(pointRecordRepository.findHistoryByStudentIdIn(List.of(301L, 302L))).thenReturn(List.of());
        when(pdfReportRepository.findFirstByOrderByReportDateDescCreatedAtDesc()).thenReturn(Optional.empty());
        when(pdfReportRepository.count()).thenReturn(0L);
        when(studentRepository.deleteAllStudentsInBulk()).thenReturn(0);

        Map<String, Object> summary = pdfReportService.deleteReport(5L);

        assertEquals(2, summary.get("deletedStudentsCount"));
        assertEquals(0, summary.get("recalculatedStudentsCount"));
        assertEquals(0L, summary.get("remainingReportsCount"));
        verify(studentRepository, times(1)).deleteByIdInBulk(List.of(301L, 302L));
        verify(studentRepository, times(1)).deleteAllStudentsInBulk();
        verify(predictionRepository, times(1)).deleteAllInBulk();
        verify(predictionService, never()).analyzeAllActiveStudents(any());
    }
}
