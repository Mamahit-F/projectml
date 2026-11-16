package com.studentinsight.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorshipEventRepository extends JpaRepository<WorshipEvent, Long> {
    List<WorshipEvent> findByEventDateBetweenOrderByEventDateAscStartTimeAsc(LocalDate start, LocalDate end);
    List<WorshipEvent> findByStatus(EventStatus status);

    @Query("SELECT e FROM WorshipEvent e WHERE " +
           "(:eventType IS NULL OR e.eventType = :eventType) AND " +
           "(:status IS NULL OR e.status = :status) AND " +
           "(:startDate IS NULL OR e.eventDate >= :startDate) AND " +
           "(:endDate IS NULL OR e.eventDate <= :endDate) " +
           "ORDER BY e.eventDate DESC, e.startTime DESC")
    Page<WorshipEvent> searchEvents(@Param("eventType") EventType eventType,
                                    @Param("status") EventStatus status,
                                    @Param("startDate") LocalDate startDate,
                                    @Param("endDate") LocalDate endDate,
                                    Pageable pageable);

    long countByStatus(EventStatus status);
}
