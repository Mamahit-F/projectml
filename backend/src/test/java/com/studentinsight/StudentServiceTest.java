package com.studentinsight;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.BadRequestException;
import com.studentinsight.residence.ResidenceCategory;
import com.studentinsight.residence.ResidenceCategoryRepository;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.student.StudentService;
import com.studentinsight.student.dto.CreateStudentRequest;
import com.studentinsight.student.dto.StudentDTO;
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
    void createStudent_Success() {
        CreateStudentRequest req = new CreateStudentRequest();
        req.setNim("105022119999");
        req.setFullName("Test Student");
        req.setStudyProgram("Informatika");
        req.setFaculty("FIK");
        req.setResidenceCategoryId(1L);
        req.setCurrentAddress("Airmadidi");

        when(studentRepository.existsByNim("105022119999")).thenReturn(false);
        when(residenceCategoryRepository.findById(1L)).thenReturn(Optional.of(mockCategory));
        when(studentRepository.save(any(Student.class))).thenAnswer(invocation -> {
            Student s = invocation.getArgument(0);
            s.setId(99L);
            return s;
        });

        StudentDTO result = studentService.createStudent(req);

        assertNotNull(result);
        assertEquals("105022119999", result.getNim());
        assertNotNull(result.getQrToken());
        assertTrue(result.getQrToken().startsWith("QR-STU-"));
        verify(studentRepository, times(1)).save(any(Student.class));
    }

    @Test
    void createStudent_DuplicateNim_ThrowsBadRequest() {
        CreateStudentRequest req = new CreateStudentRequest();
        req.setNim("105022119999");

        when(studentRepository.existsByNim("105022119999")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> studentService.createStudent(req));
        verify(studentRepository, never()).save(any(Student.class));
    }
}
