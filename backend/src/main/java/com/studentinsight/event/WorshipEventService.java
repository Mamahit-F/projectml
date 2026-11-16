package com.studentinsight.event;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.BadRequestException;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.event.dto.CreateEventRequest;
import com.studentinsight.event.dto.UpdateEventRequest;
import com.studentinsight.event.dto.WorshipEventDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorshipEventService {

    private final WorshipEventRepository repository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<WorshipEventDTO> searchEvents(EventType eventType, EventStatus status, LocalDate start, LocalDate end, Pageable pageable) {
        return repository.searchEvents(eventType, status, start, end, pageable)
                .map(WorshipEventDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<WorshipEventDTO> getActiveOrUpcomingEvents() {
        return repository.findAll().stream()
                .filter(e -> e.getStatus() == EventStatus.SCHEDULED || e.getStatus() == EventStatus.ONGOING)
                .map(WorshipEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WorshipEventDTO getEventById(Long id) {
        WorshipEvent event = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorshipEvent", "id", id));
        return WorshipEventDTO.fromEntity(event);
    }

    @Transactional
    public WorshipEventDTO createEvent(CreateEventRequest request) {
        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new BadRequestException("Waktu selesai tidak boleh lebih awal dari waktu mulai");
        }

        WorshipEvent event = WorshipEvent.builder()
                .title(request.getTitle().trim())
                .eventType(request.getEventType())
                .eventDate(request.getEventDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .location(request.getLocation().trim())
                .status(request.getStatus() != null ? request.getStatus() : EventStatus.SCHEDULED)
                .description(request.getDescription())
                .build();

        WorshipEvent saved = repository.save(event);
        auditLogService.log("CREATE_EVENT", "WorshipEvent", saved.getId(), null, saved.getTitle(), "Created worship event of type: " + saved.getEventType());
        return WorshipEventDTO.fromEntity(saved);
    }

    @Transactional
    public WorshipEventDTO updateEvent(Long id, UpdateEventRequest request) {
        WorshipEvent event = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorshipEvent", "id", id));

        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new BadRequestException("Waktu selesai tidak boleh lebih awal dari waktu mulai");
        }

        String oldStatus = event.getStatus().name();
        event.setTitle(request.getTitle().trim());
        event.setEventType(request.getEventType());
        event.setEventDate(request.getEventDate());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setLocation(request.getLocation().trim());
        event.setStatus(request.getStatus());
        event.setDescription(request.getDescription());

        WorshipEvent updated = repository.save(event);
        auditLogService.log("UPDATE_EVENT", "WorshipEvent", updated.getId(), oldStatus, updated.getStatus().name(), "Updated worship event details");
        return WorshipEventDTO.fromEntity(updated);
    }

    @Transactional
    public WorshipEventDTO updateStatus(Long id, EventStatus status) {
        WorshipEvent event = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorshipEvent", "id", id));
        String oldStatus = event.getStatus().name();
        event.setStatus(status);
        WorshipEvent updated = repository.save(event);
        auditLogService.log("UPDATE_EVENT_STATUS", "WorshipEvent", id, oldStatus, status.name(), "Changed status to: " + status);
        return WorshipEventDTO.fromEntity(updated);
    }
}
