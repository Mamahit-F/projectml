package com.studentinsight;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.emergency.EmergencyContactRepository;
import com.studentinsight.residence.ResidenceCategory;
import com.studentinsight.residence.ResidenceCategoryRepository;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.student.StudentService;
import com.studentinsight.student.dto.StudentDTO;
import com.studentinsight.student.dto.UpdateStudentRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private ResidenceCategoryRepository residenceCategoryRepository;

    @Mock
    private EmergencyContactRepository emergencyContactRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private StudentService studentService;

    private ResidenceCategory mockCategory;

    @BeforeEach
    void setUp() {
        mockCategory = ResidenceCategory.builder()
                .id(1L)
                .code("OUTSIDER_DEKAT")
                .name("Outsider Dekat")
                .build();
    }

    @Test
    void updateStudent_CompletesResidenceAndAddress() {
        Student existing = Student.builder()
                .id(10L)
                .nim("S22310477")
                .fullName("Rivanda Elva Lumatau")
                .studyProgram("Sistem Informasi")
                .faculty("Fakultas Ilmu Komputer")
                .latestSabbathPoints(196)
                .riskCategory("HIGH")
                .status("ACTIVE")
                .build();

        UpdateStudentRequest req = new UpdateStudentRequest();
        req.setFullName("Rivanda Elva Lumatau");
        req.setStudyProgram("Sistem Informasi");
        req.setFaculty("Fakultas Ilmu Komputer");
        req.setResidenceCategoryId(1L);
        req.setCurrentAddress("Kost Filadelfia, Airmadidi");
        req.setPhoneNumber("081234567890");
        req.setStatus("ACTIVE");

        when(studentRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(residenceCategoryRepository.findById(1L)).thenReturn(Optional.of(mockCategory));
        when(studentRepository.save(any(Student.class))).thenAnswer(inv -> inv.getArgument(0));

        StudentDTO result = studentService.updateStudent(10L, req);

        assertNotNull(result);
        assertEquals("OUTSIDER_DEKAT", result.getResidenceCategory().getCode());
        assertEquals("Kost Filadelfia, Airmadidi", result.getCurrentAddress());
        verify(studentRepository, times(1)).save(any(Student.class));
    }

    @Test
    void updateStudent_MissingId_ThrowsNotFound() {
        UpdateStudentRequest req = new UpdateStudentRequest();
        req.setFullName("Test");
        req.setStudyProgram("Informatika");
        req.setFaculty("FIK");

        when(studentRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> studentService.updateStudent(999L, req));
    }
}
