package com.galaxium.holdservice.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

class AuditEventTest {

    private AuditEvent auditEvent;

    @BeforeEach
    void setUp() {
        auditEvent = new AuditEvent();
    }

    // --- getters / setters ---

    @Test
    void shouldStoreAndReturnEventId() {
        auditEvent.setEventId("evt-001");
        assertThat(auditEvent.getEventId()).isEqualTo("evt-001");
    }

    @Test
    void shouldStoreAndReturnEntityType() {
        auditEvent.setEntityType("Hold");
        assertThat(auditEvent.getEntityType()).isEqualTo("Hold");
    }

    @Test
    void shouldStoreAndReturnEntityId() {
        auditEvent.setEntityId("H-2024-000001");
        assertThat(auditEvent.getEntityId()).isEqualTo("H-2024-000001");
    }

    @Test
    void shouldStoreAndReturnEventType() {
        auditEvent.setEventType("HOLD_CREATED");
        assertThat(auditEvent.getEventType()).isEqualTo("HOLD_CREATED");
    }

    @Test
    void shouldStoreAndReturnDetails() {
        auditEvent.setDetails("Hold created for quote Q-2024-000001");
        assertThat(auditEvent.getDetails()).isEqualTo("Hold created for quote Q-2024-000001");
    }

    @Test
    void shouldAllowNullDetails() {
        auditEvent.setDetails(null);
        assertThat(auditEvent.getDetails()).isNull();
    }

    @Test
    void shouldStoreAndReturnCreatedAt() {
        Date now = new Date();
        auditEvent.setCreatedAt(now);
        assertThat(auditEvent.getCreatedAt()).isEqualTo(now);
    }

    // --- @PrePersist onCreate() ---

    @Test
    void onCreate_shouldSetCreatedAt_whenCreatedAtIsNull() {
        Date before = new Date();
        auditEvent.onCreate();
        Date after = new Date();

        assertThat(auditEvent.getCreatedAt())
                .isNotNull()
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
    }

    @Test
    void onCreate_shouldNotOverwriteCreatedAt_whenAlreadySet() {
        Date original = new Date(0L); // epoch — unmistakably different from "now"
        auditEvent.setCreatedAt(original);

        auditEvent.onCreate();

        assertThat(auditEvent.getCreatedAt()).isEqualTo(original);
    }

    @Test
    void onCreate_shouldLeaveEventIdUnchanged() {
        auditEvent.setEventId("evt-42");
        auditEvent.onCreate();

        assertThat(auditEvent.getEventId()).isEqualTo("evt-42");
    }

    // --- default state after construction ---

    @Test
    void shouldHaveAllNullFieldsByDefault() {
        AuditEvent fresh = new AuditEvent();

        assertThat(fresh.getEventId()).isNull();
        assertThat(fresh.getEntityType()).isNull();
        assertThat(fresh.getEntityId()).isNull();
        assertThat(fresh.getEventType()).isNull();
        assertThat(fresh.getDetails()).isNull();
        assertThat(fresh.getCreatedAt()).isNull();
    }
}
