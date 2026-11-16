package com.studentinsight;

import com.studentinsight.attendance.*;
import com.studentinsight.attendance.dto.ScanQrRequest;
import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.BadRequestException;
import com.studentinsight.event.EventStatus;
import com.studentinsight.event.EventType;
import com.studentinsight.event.WorshipEvent;
import com.studentinsight.event.WorshipEventRepository;
import com.studentinsight.residence.ResidenceCategory;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.user.UserRepository;
import com.studentinsight.violation.ViolationPointRepository;
import com.studentinsight.violation.ViolationPointService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private WorshipEventRepository worshipEventRepository;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private AttendanceRuleService attendanceRuleService;
    @Mock
    private ViolationPointService violationPointService;
    @Mock
    private ViolationPointRepository violationPointRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AttendanceService attendanceService;

    private Student mockStudent;
    private WorshipEvent mockEvent;

    @BeforeEach
    void setUp() {
        ResidenceCategory category = ResidenceCategory.builder()
                .id(1L)
                .code("OUTSIDER_DEKAT")
                .name("Outsider Dekat")
                .build();

        mockStudent = Student.builder()
                .id(1L)
                .nim("105022110001")
                .fullName("Kevin Jonathan")
                .qrToken("QR-TEST-TOKEN-123456")
                .status("ACTIVE")
                .residenceCategory(category)
                .totalViolationPoints(0)
                .build();

        mockEvent = WorshipEvent.builder()
                .id(10L)
                .title("Ibadah Sabat Pagi")
                .eventType(EventType.SABBATH_MORNING)
                .eventDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .location("Fernandez Hall")
                .status(EventStatus.ONGOING)
                .build();
    }

    @Test
    void recordQrScan_Success() {
        ScanQrRequest request = new ScanQrRequest();
        request.setQrToken("QR-TEST-TOKEN-123456");
        request.setWorshipEventId(10L);

        when(studentRepository.findByQrToken("QR-TEST-TOKEN-123456")).thenReturn(Optional.of(mockStudent));
        when(worshipEventRepository.findById(10L)).thenReturn(Optional.of(mockEvent));
        when(attendanceRepository.findByStudentIdAndWorshipEventId(1L, 10L)).thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = attendanceService.recordQrScan(request);

        assertNotNull(result);
        assertEquals(AttendanceStatus.PRESENT, result.getStatus());
        assertEquals("105022110001", result.getStudentNim());
        verify(attendanceRepository, times(1)).save(any(Attendance.class));
    }

    @Test
    void recordQrScan_AlreadyPresent_ThrowsBadRequest() {
        ScanQrRequest request = new ScanQrRequest();
        request.setQrToken("QR-TEST-TOKEN-123456");
        request.setWorshipEventId(10L);

        Attendance existingAtt = Attendance.builder()
                .id(50L)
                .student(mockStudent)
                .worshipEvent(mockEvent)
                .status(AttendanceStatus.PRESENT)
                .build();

        when(studentRepository.findByQrToken("QR-TEST-TOKEN-123456")).thenReturn(Optional.of(mockStudent));
        when(worshipEventRepository.findById(10L)).thenReturn(Optional.of(mockEvent));
        when(attendanceRepository.findByStudentIdAndWorshipEventId(1L, 10L)).thenReturn(Optional.of(existingAtt));

        assertThrows(BadRequestException.class, () -> attendanceService.recordQrScan(request));
    }
}
