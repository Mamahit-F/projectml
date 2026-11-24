package com.studentinsight.pdfreport;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.BadRequestException;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.prediction.MLPredictionRepository;
import com.studentinsight.prediction.MLPredictionService;
import com.studentinsight.prediction.dto.PredictionSummaryDTO;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.user.User;
import com.studentinsight.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfReportService {

    private final PdfReportRepository pdfReportRepository;
    private final StudentPointRecordRepository pointRecordRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final MLPredictionService predictionService;
    private final MLPredictionRepository predictionRepository;
    private final AuditLogService auditLogService;
    private final RestTemplate restTemplate;

    @Value("${app.ml.service-url:http://localhost:8001}")
    private String mlServiceUrl;

    @Value("${app.ml.api-key:}")
    private String mlApiKey;

    private User getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                return userRepository.findByUsername(auth.getName()).orElse(null);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> previewPdf(MultipartFile file) {
        validatePdfFile(file);
        return callMlPdfParser(file);
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> importPdf(
            MultipartFile file,
            LocalDate reportDate,
            String facultyName,
            String periodLabel,
            String notes) {

        validatePdfFile(file);
        Map<String, Object> parsed = callMlPdfParser(file);

        List<Map<String, Object>> parsedRecords = (List<Map<String, Object>>) parsed.getOrDefault("records", List.of());
        if (parsedRecords.isEmpty()) {
            throw new BadRequestException("Tidak ada data mahasiswa yang terbaca dari file PDF ini.");
        }

        String resolvedFaculty = (facultyName != null && !facultyName.isBlank())
                ? facultyName.trim()
                : String.valueOf(parsed.getOrDefault("detected_faculty", "Universitas Klabat"));
        LocalDate resolvedDate = reportDate != null ? reportDate : LocalDate.now();
        String resolvedPeriod = (periodLabel != null && !periodLabel.isBlank())
                ? periodLabel.trim()
                : "Update " + resolvedDate;

        PdfReport report = PdfReport.builder()
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "report.pdf")
                .facultyName(resolvedFaculty)
                .reportDate(resolvedDate)
                .periodLabel(resolvedPeriod)
                .totalStudents(((Number) parsed.getOrDefault("total_rows", parsedRecords.size())).intValue())
                .zeroPointStudents(((Number) parsed.getOrDefault("zero_point_count", 0)).intValue())
                .studentsWithPoints(((Number) parsed.getOrDefault("with_point_count", 0)).intValue())
                .maxPoints(((Number) parsed.getOrDefault("max_points", 0)).intValue())
                .avgPoints(((Number) parsed.getOrDefault("avg_points", 0.0)).doubleValue())
                .uploadedByUser(getCurrentUser())
                .notes(notes)
                .build();

        PdfReport savedReport = pdfReportRepository.save(report);

        // Preload existing students keyed by uppercase NIM for fast batch upsert
        Map<String, Student> existingByNim = studentRepository.findAll().stream()
                .collect(Collectors.toMap(s -> s.getNim().trim().toUpperCase(), s -> s, (a, b) -> a));

        List<Student> studentsToSave = new ArrayList<>();
        Map<String, Map<String, Object>> recordPayloadByNim = new LinkedHashMap<>();

        int newStudentsCount = 0;
        int updatedStudentsCount = 0;

        for (Map<String, Object> rec : parsedRecords) {
            String nim = String.valueOf(rec.get("nim")).trim().toUpperCase();
            String firstName = rec.get("first_name") != null ? String.valueOf(rec.get("first_name")).trim() : "";
            String lastName = rec.get("last_name") != null ? String.valueOf(rec.get("last_name")).trim() : "";
            String fullName = String.valueOf(rec.getOrDefault("full_name", nim)).trim();
            String prodi = String.valueOf(rec.getOrDefault("study_program", "Umum")).trim();
            int points = rec.get("sabbath_points") != null ? ((Number) rec.get("sabbath_points")).intValue() : 0;

            Student student = existingByNim.get(nim);
            int delta;
            if (student == null) {
                newStudentsCount++;
                delta = 0;
                student = Student.builder()
                        .nim(nim)
                        .firstName(firstName)
                        .lastName(lastName)
                        .fullName(fullName)
                        .studyProgram(prodi)
                        .faculty(resolvedFaculty)
                        .status("ACTIVE")
                        .latestSabbathPoints(points)
                        .previousSabbathPoints(null)
                        .pointsDelta(0)
                        .totalViolationPoints(points)
                        .riskCategory(points == 0 ? "SAFE" : "LOW")
                        .build();
                existingByNim.put(nim, student);
            } else {
                updatedStudentsCount++;
                int prev = student.getLatestSabbathPoints() != null ? student.getLatestSabbathPoints() : 0;
                delta = points - prev;
                student.setFirstName(firstName.isEmpty() ? student.getFirstName() : firstName);
                student.setLastName(lastName.isEmpty() ? student.getLastName() : lastName);
                student.setFullName(fullName);
                student.setStudyProgram(prodi);
                student.setFaculty(resolvedFaculty);
                student.setPreviousSabbathPoints(prev);
                student.setLatestSabbathPoints(points);
                student.setPointsDelta(delta);
                student.setTotalViolationPoints(points);
                if (!"ACTIVE".equalsIgnoreCase(student.getStatus())) {
                    student.setStatus("ACTIVE");
                }
            }
            studentsToSave.add(student);

            Map<String, Object> meta = new HashMap<>(rec);
            meta.put("computed_delta", delta);
            recordPayloadByNim.put(nim, meta);
        }

        List<Student> savedStudents = studentRepository.saveAll(studentsToSave);
        Map<String, Student> savedByNim = savedStudents.stream()
                .collect(Collectors.toMap(s -> s.getNim().trim().toUpperCase(), s -> s, (a, b) -> a));

        List<StudentPointRecord> pointRecords = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : recordPayloadByNim.entrySet()) {
            Student st = savedByNim.get(entry.getKey());
            Map<String, Object> rec = entry.getValue();
            int points = rec.get("sabbath_points") != null ? ((Number) rec.get("sabbath_points")).intValue() : 0;
            int delta = rec.get("computed_delta") != null ? ((Number) rec.get("computed_delta")).intValue() : 0;
            Integer rowNum = rec.get("row_number") != null ? ((Number) rec.get("row_number")).intValue() : null;

            pointRecords.add(StudentPointRecord.builder()
                    .pdfReport(savedReport)
                    .student(st)
                    .rowNumber(rowNum)
                    .sabbathPoints(points)
                    .pointsDelta(delta)
                    .riskCategory(points == 0 ? "SAFE" : "LOW")
                    .build());
        }
        pointRecordRepository.saveAll(pointRecords);

        // Immediately run dynamic K-Means clustering + semester cutoff projection
        predictionService.analyzeAllActiveStudents(savedReport);
        PredictionSummaryDTO analysisSummary = predictionService.getSummary();

        auditLogService.log("IMPORT_PDF_REPORT", "PdfReport", savedReport.getId(), null,
                savedReport.getFileName() + " (" + savedReport.getTotalStudents() + " students)",
                "Imported PDF report for " + resolvedFaculty + " dated " + resolvedDate);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("report", toReportMap(savedReport));
        result.put("newStudentsCount", newStudentsCount);
        result.put("updatedStudentsCount", updatedStudentsCount);
        result.put("warnings", parsed.getOrDefault("warnings", List.of()));
        result.put("prodiSummary", parsed.getOrDefault("prodi_summary", List.of()));
        result.put("analysisSummary", analysisSummary);
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllReports() {
        return pdfReportRepository.findAllByOrderByReportDateDescCreatedAtDesc().stream()
                .map(this::toReportMap)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getReportDetail(Long id) {
        PdfReport report = pdfReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PdfReport", "id", id));
        List<StudentPointRecord> records = pointRecordRepository.findByPdfReportIdOrderBySabbathPointsDescRowNumberAsc(id);

        Map<String, List<StudentPointRecord>> byProdi = records.stream()
                .collect(Collectors.groupingBy(r -> r.getStudent().getStudyProgram() != null ? r.getStudent().getStudyProgram() : "Umum"));

        List<Map<String, Object>> prodiBreakdown = byProdi.entrySet().stream()
                .map(e -> {
                    List<StudentPointRecord> list = e.getValue();
                    int total = list.size();
                    long zero = list.stream().filter(r -> r.getSabbathPoints() == 0).count();
                    long high = list.stream().filter(r -> "HIGH".equalsIgnoreCase(r.getRiskCategory())).count();
                    int max = list.stream().mapToInt(StudentPointRecord::getSabbathPoints).max().orElse(0);
                    double avg = total > 0 ? Math.round(list.stream().mapToInt(StudentPointRecord::getSabbathPoints).average().orElse(0.0) * 10.0) / 10.0 : 0.0;

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("studyProgram", e.getKey());
                    m.put("totalStudents", total);
                    m.put("zeroPointStudents", zero);
                    m.put("studentsWithPoints", total - zero);
                    m.put("highRiskCount", high);
                    m.put("avgPoints", avg);
                    m.put("maxPoints", max);
                    return m;
                })
                .sorted((a, b) -> Integer.compare((Integer) b.get("totalStudents"), (Integer) a.get("totalStudents")))
                .collect(Collectors.toList());

        Map<String, Long> riskCounts = new LinkedHashMap<>();
        riskCounts.put("SAFE", records.stream().filter(r -> "SAFE".equalsIgnoreCase(r.getRiskCategory())).count());
        riskCounts.put("LOW", records.stream().filter(r -> "LOW".equalsIgnoreCase(r.getRiskCategory())).count());
        riskCounts.put("MEDIUM", records.stream().filter(r -> "MEDIUM".equalsIgnoreCase(r.getRiskCategory())).count());
        riskCounts.put("HIGH", records.stream().filter(r -> "HIGH".equalsIgnoreCase(r.getRiskCategory())).count());

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("report", toReportMap(report));
        detail.put("prodiBreakdown", prodiBreakdown);
        detail.put("riskCounts", riskCounts);
        return detail;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getReportRecords(Long reportId, String search, String studyProgram, String riskCategory, Pageable pageable) {
        if (!pdfReportRepository.existsById(reportId)) {
            throw new ResourceNotFoundException("PdfReport", "id", reportId);
        }
        return pointRecordRepository.searchByReport(reportId, search, studyProgram, riskCategory, pageable)
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("rowNumber", r.getRowNumber());
                    m.put("studentId", r.getStudent().getId());
                    m.put("nim", r.getStudent().getNim());
                    m.put("fullName", r.getStudent().getFullName());
                    m.put("studyProgram", r.getStudent().getStudyProgram());
                    m.put("sabbathPoints", r.getSabbathPoints());
                    m.put("pointsDelta", r.getPointsDelta());
                    m.put("riskCategory", r.getRiskCategory());
                    m.put("projectedEndPoints", r.getProjectedEndPoints());
                    m.put("percentileRank", r.getPercentileRank());
                    return m;
                });
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStudentPointHistory(Long studentId) {
        return pointRecordRepository.findHistoryByStudentId(studentId).stream()
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("pdfReportId", r.getPdfReport().getId());
                    m.put("fileName", r.getPdfReport().getFileName());
                    m.put("reportDate", r.getPdfReport().getReportDate());
                    m.put("periodLabel", r.getPdfReport().getPeriodLabel());
                    m.put("sabbathPoints", r.getSabbathPoints());
                    m.put("pointsDelta", r.getPointsDelta());
                    m.put("riskCategory", r.getRiskCategory());
                    m.put("projectedEndPoints", r.getProjectedEndPoints());
                    m.put("percentileRank", r.getPercentileRank());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> deleteReport(Long id) {
        PdfReport report = pdfReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PdfReport", "id", id));
        String deletedFileName = report.getFileName();

        // 1. Capture exact students linked to THIS PDF before deleting records
        List<Long> affectedStudentIds = pointRecordRepository.findDistinctStudentIdsByPdfReportId(id);

        // 2. Remove predictions & point records tied to this PDF, then delete the PDF archive
        predictionRepository.deleteByPdfReportId(id);
        pointRecordRepository.deleteByPdfReportId(id);
        pointRecordRepository.flush();
        pdfReportRepository.delete(report);
        pdfReportRepository.flush();

        // 3. Synchronize ONLY affected students from the deleted PDF:
        //    - Students who ONLY existed in this PDF -> deleted completely
        //    - Students who also exist in other remaining PDF(s) -> recalculated from remaining history
        List<Long> studentIdsToDelete = new ArrayList<>();
        List<Student> studentsToUpdate = new ArrayList<>();
        List<StudentPointRecord> recordsToUpdate = new ArrayList<>();

        for (Long studentId : affectedStudentIds) {
            List<StudentPointRecord> remainingHistory = pointRecordRepository.findHistoryByStudentId(studentId);
            if (remainingHistory.isEmpty()) {
                studentIdsToDelete.add(studentId);
            } else {
                studentRepository.findById(studentId).ifPresent(student -> {
                    recalculateStudentFromHistory(student, remainingHistory, recordsToUpdate);
                    studentsToUpdate.add(student);
                });
            }
        }

        if (!studentIdsToDelete.isEmpty()) {
            predictionRepository.deleteByStudentIdIn(studentIdsToDelete);
            predictionRepository.flush();
            studentRepository.deleteAllById(studentIdsToDelete);
            studentRepository.flush();
        }

        if (!recordsToUpdate.isEmpty()) {
            pointRecordRepository.saveAll(recordsToUpdate);
        }
        if (!studentsToUpdate.isEmpty()) {
            studentRepository.saveAll(studentsToUpdate);
            studentRepository.flush();
        }

        // 4. Re-sync dynamic risk analysis on remaining reports (if any remain)
        Optional<PdfReport> latestRemaining = pdfReportRepository.findFirstByOrderByReportDateDescCreatedAtDesc();
        long remainingReportsCount = pdfReportRepository.count();
        if (latestRemaining.isPresent() && studentRepository.countByStatus("ACTIVE") > 0) {
            predictionService.analyzeAllActiveStudents(latestRemaining.get());
        }

        auditLogService.log(
                "DELETE_PDF_REPORT",
                "PdfReport",
                id,
                deletedFileName,
                "deletedStudents=" + studentIdsToDelete.size() + ", recalculatedStudents=" + studentsToUpdate.size(),
                "Deleted PDF report archive and synchronized student records");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("deletedReportId", id);
        result.put("deletedFileName", deletedFileName);
        result.put("deletedStudentsCount", studentIdsToDelete.size());
        result.put("recalculatedStudentsCount", studentsToUpdate.size());
        result.put("remainingReportsCount", remainingReportsCount);
        return result;
    }

    @Transactional
    public Map<String, Object> syncStudentsWithPdfArchives() {
        Set<Long> studentIdsInAnyPdf = new HashSet<>(pointRecordRepository.findAllStudentIdsWithRecords());
        List<Student> allStudents = studentRepository.findAll();

        List<Long> orphanIds = new ArrayList<>();
        List<Student> studentsToRecalc = new ArrayList<>();
        List<StudentPointRecord> recordsToUpdate = new ArrayList<>();

        for (Student s : allStudents) {
            if (!studentIdsInAnyPdf.contains(s.getId())) {
                orphanIds.add(s.getId());
            } else {
                List<StudentPointRecord> hist = pointRecordRepository.findHistoryByStudentId(s.getId());
                recalculateStudentFromHistory(s, hist, recordsToUpdate);
                studentsToRecalc.add(s);
            }
        }

        if (!orphanIds.isEmpty()) {
            predictionRepository.deleteByStudentIdIn(orphanIds);
            predictionRepository.flush();
            studentRepository.deleteAllById(orphanIds);
            studentRepository.flush();
        }
        if (!recordsToUpdate.isEmpty()) {
            pointRecordRepository.saveAll(recordsToUpdate);
        }
        if (!studentsToRecalc.isEmpty()) {
            studentRepository.saveAll(studentsToRecalc);
            studentRepository.flush();
        }

        Optional<PdfReport> latestRemaining = pdfReportRepository.findFirstByOrderByReportDateDescCreatedAtDesc();
        if (latestRemaining.isPresent() && !studentsToRecalc.isEmpty()) {
            predictionService.analyzeAllActiveStudents(latestRemaining.get());
        }

        auditLogService.log(
                "SYNC_STUDENTS_WITH_PDF",
                "Student",
                null,
                null,
                "removedOrphans=" + orphanIds.size() + ", syncedStudents=" + studentsToRecalc.size(),
                "Synchronized student directory with current PDF archives");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("removedOrphanStudentsCount", orphanIds.size());
        result.put("syncedStudentsCount", studentsToRecalc.size());
        result.put("remainingReportsCount", pdfReportRepository.count());
        return result;
    }

    private void recalculateStudentFromHistory(
            Student student,
            List<StudentPointRecord> orderedHistory,
            List<StudentPointRecord> recordsToUpdate) {
        if (orderedHistory == null || orderedHistory.isEmpty()) {
            return;
        }
        // Recalculate chronological delta along remaining snapshots
        Integer runningPrev = null;
        for (StudentPointRecord rec : orderedHistory) {
            int pts = rec.getSabbathPoints() != null ? rec.getSabbathPoints() : 0;
            int expectedDelta = runningPrev == null ? 0 : (pts - runningPrev);
            if (!Objects.equals(rec.getPointsDelta(), expectedDelta)) {
                rec.setPointsDelta(expectedDelta);
                recordsToUpdate.add(rec);
            }
            runningPrev = pts;
        }

        StudentPointRecord latest = orderedHistory.get(orderedHistory.size() - 1);
        StudentPointRecord prev = orderedHistory.size() >= 2 ? orderedHistory.get(orderedHistory.size() - 2) : null;

        int latestPts = latest.getSabbathPoints() != null ? latest.getSabbathPoints() : 0;
        Integer prevPts = prev != null ? prev.getSabbathPoints() : null;
        int delta = prevPts != null ? (latestPts - prevPts) : 0;

        student.setLatestSabbathPoints(latestPts);
        student.setPreviousSabbathPoints(prevPts);
        student.setPointsDelta(delta);
        student.setTotalViolationPoints(latestPts);
        if (latest.getPdfReport() != null && latest.getPdfReport().getFacultyName() != null) {
            student.setFaculty(latest.getPdfReport().getFacultyName());
        }
        student.setRiskCategory(latest.getRiskCategory() != null ? latest.getRiskCategory() : (latestPts == 0 ? "SAFE" : "LOW"));
        student.setProjectedEndPoints(latest.getProjectedEndPoints());
    }

    public Map<String, Object> toReportMap(PdfReport r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("fileName", r.getFileName());
        m.put("facultyName", r.getFacultyName());
        m.put("reportDate", r.getReportDate());
        m.put("periodLabel", r.getPeriodLabel());
        m.put("totalStudents", r.getTotalStudents());
        m.put("zeroPointStudents", r.getZeroPointStudents());
        m.put("studentsWithPoints", r.getStudentsWithPoints());
        m.put("maxPoints", r.getMaxPoints());
        m.put("avgPoints", r.getAvgPoints());
        m.put("notes", r.getNotes());
        m.put("createdAt", r.getCreatedAt());
        return m;
    }

    private void validatePdfFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Silakan pilih file PDF terlebih dahulu.");
        }
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase().endsWith(".pdf")) {
            throw new BadRequestException("Format file tidak didukung. Harap unggah dokumen PDF (.pdf).");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callMlPdfParser(MultipartFile file) {
        String endpoint = mlServiceUrl + "/parse-pdf";
        try {
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.pdf";

            ByteArrayResource resource = new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };

            HttpHeaders partHeaders = new HttpHeaders();
            partHeaders.setContentType(MediaType.APPLICATION_PDF);
            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(resource, partHeaders);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", filePart);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            if (mlApiKey != null && !mlApiKey.isBlank()) {
                headers.set("X-ML-API-Key", mlApiKey.trim());
            }

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, requestEntity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            throw new BadRequestException("Layanan pembaca PDF tidak memberikan respon yang valid.");
        } catch (HttpStatusCodeException ex) {
            log.error("ML PDF parser error {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BadRequestException("Gagal membaca PDF: " + extractErrorDetail(ex.getResponseBodyAsString()));
        } catch (BadRequestException bre) {
            throw bre;
        } catch (Exception ex) {
            log.error("Failed connecting to ML PDF parser at {}", endpoint, ex);
            throw new BadRequestException("Layanan pembaca PDF (ML Service) sedang tidak aktif di " + mlServiceUrl + ". Pastikan layanan ML berjalan.");
        }
    }

    private String extractErrorDetail(String body) {
        if (body == null || body.isBlank()) return "Format tabel PDF tidak dikenali.";
        int idx = body.indexOf("\"detail\"");
        if (idx >= 0) {
            int colon = body.indexOf(':', idx);
            int q1 = body.indexOf('"', colon + 1);
            int q2 = body.indexOf('"', q1 + 1);
            if (q1 > 0 && q2 > q1) {
                return body.substring(q1 + 1, q2);
            }
        }
        return body;
    }
}
