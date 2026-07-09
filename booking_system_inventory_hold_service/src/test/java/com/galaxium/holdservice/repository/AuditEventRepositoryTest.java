package com.galaxium.holdservice.repository;

import com.galaxium.holdservice.domain.AuditEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class AuditEventRepositoryTest {

    @Autowired
    private AuditEventRepository auditEventRepository;

    @BeforeEach
    void setUp() {
        auditEventRepository.deleteAll();
    }

    // --- save and findById ---

    @Test
    void shouldPersistAndFindAuditEventById() {
        AuditEvent event = buildEvent("Hold", "H-2025-000001", "HOLD_CREATED", "hold created");
        AuditEvent saved = auditEventRepository.save(event);

        Optional<AuditEvent> found = auditEventRepository.findById(saved.getEventId());

        assertThat(found).isPresent();
        assertThat(found.get().getEntityId()).isEqualTo("H-2025-000001");
    }

    @Test
    void shouldReturnEmptyOptional_whenEventDoesNotExist() {
        Optional<AuditEvent> found = auditEventRepository.findById("non-existent-id");

        assertThat(found).isEmpty();
    }

    @Test
    void shouldPersistAllFields() {
        AuditEvent event = buildEvent("Quote", "Q-2025-000001", "QUOTE_CREATED", "quote created details");
        AuditEvent saved = auditEventRepository.save(event);

        AuditEvent found = auditEventRepository.findById(saved.getEventId()).get();

        assertThat(found.getEntityType()).isEqualTo("Quote");
        assertThat(found.getEntityId()).isEqualTo("Q-2025-000001");
        assertThat(found.getEventType()).isEqualTo("QUOTE_CREATED");
        assertThat(found.getDetails()).isEqualTo("quote created details");
    }

    @Test
    void shouldAllowNullDetails() {
        AuditEvent event = buildEvent("Hold", "H-2025-000001", "HOLD_EXPIRED", null);
        AuditEvent saved = auditEventRepository.save(event);

        AuditEvent found = auditEventRepository.findById(saved.getEventId()).get();

        assertThat(found.getDetails()).isNull();
    }

    // --- findAll ---

    @Test
    void shouldReturnAllPersistedEvents() {
        auditEventRepository.save(buildEvent("Hold",  "H-2025-000001", "HOLD_CREATED",  null));
        auditEventRepository.save(buildEvent("Quote", "Q-2025-000001", "QUOTE_CREATED", null));

        List<AuditEvent> all = auditEventRepository.findAll();

        assertThat(all).hasSize(2);
    }

    @Test
    void shouldReturnEmptyList_whenNoEventsPersisted() {
        assertThat(auditEventRepository.findAll()).isEmpty();
    }

    // --- delete ---

    @Test
    void shouldDeleteEventById() {
        AuditEvent saved = auditEventRepository.save(
                buildEvent("Hold", "H-2025-000001", "HOLD_CREATED", null));

        auditEventRepository.deleteById(saved.getEventId());

        assertThat(auditEventRepository.findById(saved.getEventId())).isEmpty();
    }

    // --- @PrePersist createdAt auto-population ---

    @Test
    void shouldPopulateCreatedAt_onSave() {
        Date before = new Date();
        AuditEvent saved = auditEventRepository.save(
                buildEvent("Hold", "H-2025-000001", "HOLD_CREATED", null));
        Date after = new Date();

        AuditEvent found = auditEventRepository.findById(saved.getEventId()).get();

        assertThat(found.getCreatedAt())
                .isNotNull()
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
    }

    // --- auto-generated eventId (UUID) ---

    @Test
    void shouldAssignNonNullEventId_afterSave() {
        AuditEvent saved = auditEventRepository.save(
                buildEvent("Hold", "H-2025-000001", "HOLD_CREATED", null));

        assertThat(saved.getEventId()).isNotNull().isNotEmpty();
    }

    @Test
    void shouldAssignUniqueEventIds_toDistinctEvents() {
        AuditEvent e1 = auditEventRepository.save(
                buildEvent("Hold", "H-2025-000001", "HOLD_CREATED", null));
        AuditEvent e2 = auditEventRepository.save(
                buildEvent("Hold", "H-2025-000002", "HOLD_CREATED", null));

        assertThat(e1.getEventId()).isNotEqualTo(e2.getEventId());
    }

    // --- findTop50ByOrderByCreatedAtDesc custom derived query ---

    @Test
    void findTop50ByOrderByCreatedAtDesc_shouldReturnEmpty_whenNoEvents() {
        List<AuditEvent> result = auditEventRepository.findTop50ByOrderByCreatedAtDesc();

        assertThat(result).isEmpty();
    }

    @Test
    void findTop50ByOrderByCreatedAtDesc_shouldReturnEventsInDescendingOrder() throws InterruptedException {
        // Save events with distinct createdAt timestamps
        AuditEvent e1 = buildEvent("Hold", "H-2025-000001", "HOLD_CREATED", null);
        e1.setCreatedAt(new Date(1_000_000L));
        auditEventRepository.save(e1);

        AuditEvent e2 = buildEvent("Hold", "H-2025-000002", "HOLD_EXPIRED", null);
        e2.setCreatedAt(new Date(3_000_000L));
        auditEventRepository.save(e2);

        AuditEvent e3 = buildEvent("Hold", "H-2025-000003", "HOLD_CONFIRMED", null);
        e3.setCreatedAt(new Date(2_000_000L));
        auditEventRepository.save(e3);

        List<AuditEvent> result = auditEventRepository.findTop50ByOrderByCreatedAtDesc();

        assertThat(result).hasSize(3);
        // Newest first: e2 (3_000_000) → e3 (2_000_000) → e1 (1_000_000)
        assertThat(result.get(0).getEntityId()).isEqualTo("H-2025-000002");
        assertThat(result.get(1).getEntityId()).isEqualTo("H-2025-000003");
        assertThat(result.get(2).getEntityId()).isEqualTo("H-2025-000001");
    }

    @Test
    void findTop50ByOrderByCreatedAtDesc_shouldReturnAtMost50Events() {
        // Persist 60 events
        for (int i = 1; i <= 60; i++) {
            AuditEvent event = buildEvent("Hold", "H-2025-" + String.format("%06d", i), "HOLD_CREATED", null);
            event.setCreatedAt(new Date((long) i * 1_000L));
            auditEventRepository.save(event);
        }

        List<AuditEvent> result = auditEventRepository.findTop50ByOrderByCreatedAtDesc();

        assertThat(result).hasSize(50);
    }

    @Test
    void findTop50ByOrderByCreatedAtDesc_shouldReturnNewest50_whenMoreThan50Exist() {
        // Persist 55 events, newest = index 55
        for (int i = 1; i <= 55; i++) {
            AuditEvent event = buildEvent("Hold", "H-2025-" + String.format("%06d", i), "HOLD_CREATED", null);
            event.setCreatedAt(new Date((long) i * 1_000L));
            auditEventRepository.save(event);
        }

        List<AuditEvent> result = auditEventRepository.findTop50ByOrderByCreatedAtDesc();

        // The 50 newest are indices 55 down to 6 — the oldest 5 (indices 1-5) are excluded
        List<String> returnedIds = new ArrayList<String>();
        for (AuditEvent e : result) {
            returnedIds.add(e.getEntityId());
        }

        // Index 1-5 (oldest) must not appear
        for (int i = 1; i <= 5; i++) {
            assertThat(returnedIds).doesNotContain("H-2025-" + String.format("%06d", i));
        }
        // Index 6-55 (newest 50) must all appear
        for (int i = 6; i <= 55; i++) {
            assertThat(returnedIds).contains("H-2025-" + String.format("%06d", i));
        }
    }

    // --- count ---

    @Test
    void shouldReturnCorrectCount() {
        assertThat(auditEventRepository.count()).isEqualTo(0);

        auditEventRepository.save(buildEvent("Hold", "H-2025-000001", "HOLD_CREATED", null));

        assertThat(auditEventRepository.count()).isEqualTo(1);
    }

    // --- Helpers ---

    private AuditEvent buildEvent(String entityType, String entityId, String eventType, String details) {
        AuditEvent e = new AuditEvent();
        e.setEntityType(entityType);
        e.setEntityId(entityId);
        e.setEventType(eventType);
        e.setDetails(details);
        return e;
    }
}
