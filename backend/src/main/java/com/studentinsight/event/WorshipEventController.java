package com.studentinsight.event;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.event.dto.CreateEventRequest;
import com.studentinsight.event.dto.UpdateEventRequest;
import com.studentinsight.event.dto.WorshipEventDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/worship-events")
@RequiredArgsConstructor
public class WorshipEventController {

    private final WorshipEventService eventService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<WorshipEventDTO>>> searchEvents(
            @RequestParam(required = false) EventType eventType,
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {

        Page<WorshipEventDTO> events = eventService.searchEvents(eventType, status, startDate, endDate, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok("Events retrieved successfully", events));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<WorshipEventDTO>>> getActiveOrUpcoming() {
        return ResponseEntity.ok(ApiResponse.ok("Active/upcoming events retrieved", eventService.getActiveOrUpcomingEvents()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WorshipEventDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Event retrieved", eventService.getEventById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<WorshipEventDTO>> create(@Valid @RequestBody CreateEventRequest request) {
        WorshipEventDTO created = eventService.createEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Event created successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<WorshipEventDTO>> update(@PathVariable Long id, @Valid @RequestBody UpdateEventRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Event updated successfully", eventService.updateEvent(id, request)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<WorshipEventDTO>> updateStatus(@PathVariable Long id, @RequestParam EventStatus status) {
        return ResponseEntity.ok(ApiResponse.ok("Event status updated", eventService.updateStatus(id, status)));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<WorshipEventDTO>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Event cancelled", eventService.updateStatus(id, EventStatus.CANCELLED)));
    }
}
