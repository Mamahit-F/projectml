package com.studentinsight.attendance;

import com.studentinsight.attendance.dto.*;
import com.studentinsight.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/attendances")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AttendanceDTO>>> searchAttendances(
            @RequestParam(required = false) Long worshipEventId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) AttendanceStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {

        Page<AttendanceDTO> attendances = attendanceService.searchAttendances(
                worshipEventId, studentId, status, PageRequest.of(page, size, Sort.by("id").descending()));
        return ResponseEntity.ok(ApiResponse.ok("Attendances retrieved", attendances));
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getByEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok("Event attendances retrieved", attendanceService.getAttendancesByEvent(eventId)));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.ok("Student attendances retrieved", attendanceService.getAttendancesByStudent(studentId)));
    }

    @PostMapping("/scan-qr")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<AttendanceDTO>> scanQr(@Valid @RequestBody ScanQrRequest request) {
        AttendanceDTO attendance = attendanceService.recordQrScan(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Presensi QR berhasil dicatat", attendance));
    }

    @PostMapping("/manual")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<AttendanceDTO>> manualAttendance(@Valid @RequestBody ManualAttendanceRequest request) {
        AttendanceDTO attendance = attendanceService.recordManual(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Presensi manual berhasil dicatat", attendance));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<AttendanceDTO>> updateAttendance(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAttendanceRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Presensi berhasil diperbarui/dikoreksi", attendanceService.updateAttendance(id, request)));
    }

    @PostMapping("/events/{eventId}/finalize")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Void>> finalizeEvent(@PathVariable Long eventId) {
        attendanceService.finalizeEventAttendances(eventId);
        return ResponseEntity.ok(ApiResponse.ok("Kegiatan berhasil difinalisasi dan poin pelanggaran otomatis dihitung", null));
    }
}
