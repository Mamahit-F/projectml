package com.studentinsight.student;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.BadRequestException;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.emergency.EmergencyContact;
import com.studentinsight.residence.ResidenceCategory;
import com.studentinsight.residence.ResidenceCategoryRepository;
import com.studentinsight.student.dto.CreateStudentRequest;
import com.studentinsight.student.dto.StudentDTO;
import com.studentinsight.student.dto.UpdateStudentRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final ResidenceCategoryRepository residenceCategoryRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<StudentDTO> searchStudents(String search, Long residenceCategoryId, String status, Pageable pageable) {
        String query = StringUtils.hasText(search) ? search.trim() : null;
        String stat = StringUtils.hasText(status) ? status.trim() : null;
        if (query == null && residenceCategoryId == null && stat == null) {
            return studentRepository.findAll(pageable).map(StudentDTO::fromEntity);
        }
        return studentRepository.searchStudents(query, residenceCategoryId, stat, pageable)
                .map(StudentDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<StudentDTO> getAllActiveStudents() {
        return studentRepository.findByStatus("ACTIVE").stream()
                .map(StudentDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudentDTO getStudentById(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        return StudentDTO.fromEntity(student);
    }

    @Transactional(readOnly = true)
    public StudentDTO getStudentByNim(String nim) {
        Student student = studentRepository.findByNim(nim)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "NIM", nim));
        return StudentDTO.fromEntity(student);
    }

    @Transactional(readOnly = true)
    public StudentDTO getStudentByQrToken(String qrToken) {
        Student student = studentRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "QR Token", qrToken));
        return StudentDTO.fromEntity(student);
    }

    @Transactional
    public StudentDTO createStudent(CreateStudentRequest request) {
        if (studentRepository.existsByNim(request.getNim())) {
            throw new BadRequestException("Mahasiswa dengan NIM " + request.getNim() + " sudah terdaftar!");
        }

        ResidenceCategory category = residenceCategoryRepository.findById(request.getResidenceCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("ResidenceCategory", "id", request.getResidenceCategoryId()));

        String qrToken = "QR-STU-" + UUID.randomUUID().toString().substring(0, 18).toUpperCase();

        Student student = Student.builder()
                .nim(request.getNim().trim())
                .fullName(request.getFullName().trim())
                .studyProgram(request.getStudyProgram().trim())
                .faculty(request.getFaculty().trim())
                .phoneNumber(request.getPhoneNumber())
                .residenceCategory(category)
                .currentAddress(request.getCurrentAddress())
                .status(StringUtils.hasText(request.getStatus()) ? request.getStatus() : "ACTIVE")
                .qrToken(qrToken)
                .totalViolationPoints(0)
                .build();

        if (StringUtils.hasText(request.getEmergencyContactName())) {
            EmergencyContact contact = EmergencyContact.builder()
                    .student(student)
                    .contactName(request.getEmergencyContactName())
                    .relationship(request.getEmergencyRelationship() != null ? request.getEmergencyRelationship() : "Wali")
                    .phoneNumber(request.getEmergencyPhone() != null ? request.getEmergencyPhone() : "-")
                    .address(request.getEmergencyAddress())
                    .build();
            student.getEmergencyContacts().add(contact);
        }

        Student saved = studentRepository.save(student);
        auditLogService.log("CREATE_STUDENT", "Student", saved.getId(), null, saved.getNim(), "Registered student " + saved.getFullName());
        return StudentDTO.fromEntity(saved);
    }

    @Transactional
    public StudentDTO updateStudent(Long id, UpdateStudentRequest request) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        ResidenceCategory category = residenceCategoryRepository.findById(request.getResidenceCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("ResidenceCategory", "id", request.getResidenceCategoryId()));

        student.setFullName(request.getFullName().trim());
        student.setStudyProgram(request.getStudyProgram().trim());
        student.setFaculty(request.getFaculty().trim());
        student.setPhoneNumber(request.getPhoneNumber());
        student.setResidenceCategory(category);
        student.setCurrentAddress(request.getCurrentAddress());
        student.setStatus(request.getStatus());

        Student updated = studentRepository.save(student);
        auditLogService.log("UPDATE_STUDENT", "Student", updated.getId(), null, updated.getNim(), "Updated profile for " + updated.getFullName());
        return StudentDTO.fromEntity(updated);
    }

    @Transactional
    public void archiveStudent(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        student.setStatus("INACTIVE");
        studentRepository.save(student);
        auditLogService.log("ARCHIVE_STUDENT", "Student", id, "ACTIVE", "INACTIVE", "Archived student NIM: " + student.getNim());
    }

    @Transactional
    public StudentDTO refreshQrToken(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        String newToken = "QR-STU-" + UUID.randomUUID().toString().substring(0, 18).toUpperCase();
        student.setQrToken(newToken);
        Student updated = studentRepository.save(student);
        auditLogService.log("REFRESH_QR", "Student", id, null, newToken, "Refreshed secure QR token for " + student.getNim());
        return StudentDTO.fromEntity(updated);
    }
}
