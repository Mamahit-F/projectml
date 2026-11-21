package com.studentinsight.student;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.BadRequestException;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.emergency.EmergencyContact;
import com.studentinsight.emergency.EmergencyContactRepository;
import com.studentinsight.residence.ResidenceCategory;
import com.studentinsight.residence.ResidenceCategoryRepository;
import com.studentinsight.student.dto.StudentDTO;
import com.studentinsight.student.dto.UpdateStudentRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final ResidenceCategoryRepository residenceCategoryRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<StudentDTO> searchStudents(String search, String studyProgram, String riskCategory, Long residenceCategoryId, String status, Pageable pageable) {
        String query = StringUtils.hasText(search) ? search.trim() : null;
        String prodi = StringUtils.hasText(studyProgram) ? studyProgram.trim() : null;
        String risk = StringUtils.hasText(riskCategory) ? riskCategory.trim() : null;
        String stat = StringUtils.hasText(status) ? status.trim() : null;

        if (query == null && prodi == null && risk == null && residenceCategoryId == null && stat == null) {
            return studentRepository.findAll(pageable).map(StudentDTO::fromEntity);
        }
        return studentRepository.searchStudents(query, prodi, risk, residenceCategoryId, stat, pageable)
                .map(StudentDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctStudyPrograms() {
        return studentRepository.findDistinctStudyPrograms();
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

    @Transactional
    public StudentDTO updateStudent(Long id, UpdateStudentRequest request) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        if (request.getResidenceCategoryId() != null) {
            ResidenceCategory category = residenceCategoryRepository.findById(request.getResidenceCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("ResidenceCategory", "id", request.getResidenceCategoryId()));
            student.setResidenceCategory(category);
        } else {
            student.setResidenceCategory(null);
        }

        student.setFullName(request.getFullName().trim());
        student.setStudyProgram(request.getStudyProgram().trim());
        student.setFaculty(request.getFaculty().trim());
        student.setPhoneNumber(request.getPhoneNumber());
        student.setCurrentAddress(request.getCurrentAddress());
        if (StringUtils.hasText(request.getStatus())) {
            student.setStatus(request.getStatus());
        }
        if (request.getLatestSabbathPoints() != null) {
            int newPts = Math.max(0, request.getLatestSabbathPoints());
            student.setLatestSabbathPoints(newPts);
            student.setTotalViolationPoints(newPts);
        }

        Student updated = studentRepository.save(student);
        auditLogService.log("UPDATE_STUDENT", "Student", updated.getId(), null, updated.getNim(), "Updated profile for " + updated.getFullName());
        return StudentDTO.fromEntity(updated);
    }

    @Transactional
    public StudentDTO addEmergencyContact(Long studentId, String contactName, String relationship, String phoneNumber, String address) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));
        if (!StringUtils.hasText(contactName) || !StringUtils.hasText(phoneNumber)) {
            throw new BadRequestException("Nama kontak dan nomor telepon darurat wajib diisi.");
        }

        EmergencyContact contact = EmergencyContact.builder()
                .student(student)
                .contactName(contactName.trim())
                .relationship(StringUtils.hasText(relationship) ? relationship.trim() : "Orang Tua / Wali")
                .phoneNumber(phoneNumber.trim())
                .address(address)
                .build();
        emergencyContactRepository.save(contact);
        student.getEmergencyContacts().add(contact);

        auditLogService.log("ADD_EMERGENCY_CONTACT", "EmergencyContact", contact.getId(), null, contactName,
                "Added emergency contact for student NIM: " + student.getNim());
        return StudentDTO.fromEntity(studentRepository.findById(studentId).orElse(student));
    }

    @Transactional
    public void deleteEmergencyContact(Long studentId, Long contactId) {
        EmergencyContact contact = emergencyContactRepository.findById(contactId)
                .orElseThrow(() -> new ResourceNotFoundException("EmergencyContact", "id", contactId));
        if (!contact.getStudent().getId().equals(studentId)) {
            throw new BadRequestException("Kontak darurat bukan milik mahasiswa ini.");
        }
        emergencyContactRepository.delete(contact);
        auditLogService.log("DELETE_EMERGENCY_CONTACT", "EmergencyContact", contactId, contact.getContactName(), null,
                "Deleted emergency contact for student ID: " + studentId);
    }

    @Transactional
    public void archiveStudent(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        student.setStatus("INACTIVE");
        studentRepository.save(student);
        auditLogService.log("ARCHIVE_STUDENT", "Student", id, "ACTIVE", "INACTIVE", "Archived student NIM: " + student.getNim());
    }
}
