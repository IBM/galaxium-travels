package com.galaxium.holdservice.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("AuditEvent - Domain Model Tests")
class AuditEventTest {

    private AuditEvent auditEvent;

    @BeforeEach
    void setUp() {
        auditEvent = new AuditEvent();
    }

    @Test
    @DisplayName("Should create AuditEvent with builder")
    void testCreateAuditEventWithBuilder() {
        // Arrange
        String entityType = "QUOTE";
        String entityId = "quote-123";
        String eventType = "CREATED";
        String details = "Quote created for flight 100";
        Instant now = Instant.now();

        // Act
        AuditEvent event = AuditEvent.builder()
                .entityType(entityType)
                .entityId(entityId)
                .eventType(eventType)
                .details(details)
                .createdAt(now)
                .build();

        // Assert
        assertEquals(entityType, event.getEntityType());
        assertEquals(entityId, event.getEntityId());
        assertEquals(eventType, event.getEventType());
        assertEquals(details, event.getDetails());
        assertEquals(now, event.getCreatedAt());
    }

    @Test
    @DisplayName("Should set entityType field")
    void testSetEntityType() {
        // Act
        auditEvent.setEntityType("HOLD");

        // Assert
        assertEquals("HOLD", auditEvent.getEntityType());
    }

    @Test
    @DisplayName("Should set entityId field")
    void testSetEntityId() {
        // Act
        auditEvent.setEntityId("hold-456");

        // Assert
        assertEquals("hold-456", auditEvent.getEntityId());
    }

    @Test
    @DisplayName("Should set eventType field")
    void testSetEventType() {
        // Act
        auditEvent.setEventType("EXPIRED");

        // Assert
        assertEquals("EXPIRED", auditEvent.getEventType());
    }

    @Test
    @DisplayName("Should set details field")
    void testSetDetails() {
        // Act
        String details = "Hold expired after 15 minutes";
        auditEvent.setDetails(details);

        // Assert
        assertEquals(details, auditEvent.getDetails());
    }

    @Test
    @DisplayName("Should set createdAt field")
    void testSetCreatedAt() {
        // Arrange
        Instant now = Instant.now();

        // Act
        auditEvent.setCreatedAt(now);

        // Assert
        assertEquals(now, auditEvent.getCreatedAt());
    }

    @Test
    @DisplayName("Should set eventId field")
    void testSetEventId() {
        // Act
        auditEvent.setEventId("event-789");

        // Assert
        assertEquals("event-789", auditEvent.getEventId());
    }

    @Test
    @DisplayName("Should automatically set createdAt on creation if null")
    void testOnCreateSetsCreatedAtWhenNull() {
        // Arrange
        auditEvent.setEntityType("QUOTE");
        auditEvent.setEntityId("quote-123");
        auditEvent.setEventType("CREATED");

        // Act
        auditEvent.onCreate();

        // Assert
        assertNotNull(auditEvent.getCreatedAt());
        assertTrue(auditEvent.getCreatedAt().isBefore(Instant.now().plusSeconds(1)));
    }

    @Test
    @DisplayName("Should not override createdAt if already set")
    void testOnCreateDoesNotOverrideExistingCreatedAt() {
        // Arrange
        Instant originalTime = Instant.now().minusSeconds(100);
        auditEvent.setCreatedAt(originalTime);

        // Act
        auditEvent.onCreate();

        // Assert
        assertEquals(originalTime, auditEvent.getCreatedAt());
    }

    @Test
    @DisplayName("Should construct AuditEvent with all arguments constructor")
    void testAllArgsConstructor() {
        // Arrange
        String eventId = "event-123";
        String entityType = "HOLD";
        String entityId = "hold-456";
        String eventType = "CONFIRMED";
        String details = "Hold confirmed with booking ref XYZ";
        Instant now = Instant.now();

        // Act
        AuditEvent event = new AuditEvent(eventId, entityType, entityId, eventType, details, now);

        // Assert
        assertEquals(eventId, event.getEventId());
        assertEquals(entityType, event.getEntityType());
        assertEquals(entityId, event.getEntityId());
        assertEquals(eventType, event.getEventType());
        assertEquals(details, event.getDetails());
        assertEquals(now, event.getCreatedAt());
    }

    @Test
    @DisplayName("Should create AuditEvent with no-args constructor")
    void testNoArgsConstructor() {
        // Act
        AuditEvent event = new AuditEvent();

        // Assert
        assertNull(event.getEventId());
        assertNull(event.getEntityType());
        assertNull(event.getEntityId());
        assertNull(event.getEventType());
        assertNull(event.getDetails());
        assertNull(event.getCreatedAt());
    }

    @Test
    @DisplayName("Should support equals and hashCode")
    void testEqualsAndHashCode() {
        // Arrange
        String eventId = "event-100";
        AuditEvent event1 = AuditEvent.builder()
                .eventId(eventId)
                .entityType("QUOTE")
                .entityId("quote-123")
                .eventType("CREATED")
                .build();

        AuditEvent event2 = AuditEvent.builder()
                .eventId(eventId)
                .entityType("QUOTE")
                .entityId("quote-123")
                .eventType("CREATED")
                .build();

        // Act & Assert
        assertEquals(event1, event2);
        assertEquals(event1.hashCode(), event2.hashCode());
    }

    @Test
    @DisplayName("Should have proper toString representation")
    void testToString() {
        // Arrange
        auditEvent.setEntityType("QUOTE");
        auditEvent.setEntityId("quote-123");
        auditEvent.setEventType("CREATED");

        // Act
        String toString = auditEvent.toString();

        // Assert
        assertNotNull(toString);
        assertFalse(toString.isEmpty());
        assertTrue(toString.contains("QUOTE") || toString.contains("entityType"));
    }

    @Test
    @DisplayName("Should handle null details gracefully")
    void testNullDetails() {
        // Act
        auditEvent.setDetails(null);

        // Assert
        assertNull(auditEvent.getDetails());
    }

    @Test
    @DisplayName("Should handle various entity types")
    void testVariousEntityTypes() {
        // Arrange
        String[] entityTypes = {"QUOTE", "HOLD", "BOOKING", "PAYMENT"};

        // Act & Assert
        for (String entityType : entityTypes) {
            auditEvent.setEntityType(entityType);
            assertEquals(entityType, auditEvent.getEntityType());
        }
    }

    @Test
    @DisplayName("Should handle various event types")
    void testVariousEventTypes() {
        // Arrange
        String[] eventTypes = {"CREATED", "UPDATED", "EXPIRED", "CONFIRMED", "RELEASED", "FAILED"};

        // Act & Assert
        for (String eventType : eventTypes) {
            auditEvent.setEventType(eventType);
            assertEquals(eventType, auditEvent.getEventType());
        }
    }

    @Test
    @DisplayName("Should handle long details text")
    void testLongDetailsText() {
        // Arrange
        String longDetails = "A".repeat(1000);

        // Act
        auditEvent.setDetails(longDetails);

        // Assert
        assertEquals(longDetails, auditEvent.getDetails());
        assertEquals(1000, auditEvent.getDetails().length());
    }
}
