package com.galaxium.holdservice.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Hold - Domain Model Tests")
class HoldTest {

    private Hold hold;

    @BeforeEach
    void setUp() {
        hold = new Hold();
    }

    @Test
    @DisplayName("Should create Hold with builder")
    void testCreateHoldWithBuilder() {
        // Arrange
        String holdId = "hold-123";
        String quoteId = "quote-456";
        Hold.HoldStatus status = Hold.HoldStatus.HELD;
        Instant reservedUntil = Instant.now().plusSeconds(900); // 15 minutes
        String externalBookingReference = "booking-789";
        String errorMessage = null;
        Instant createdAt = Instant.now();
        Instant updatedAt = Instant.now();

        // Act
        Hold h = Hold.builder()
                .holdId(holdId)
                .quoteId(quoteId)
                .status(status)
                .reservedUntil(reservedUntil)
                .externalBookingReference(externalBookingReference)
                .errorMessage(errorMessage)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();

        // Assert
        assertEquals(holdId, h.getHoldId());
        assertEquals(quoteId, h.getQuoteId());
        assertEquals(status, h.getStatus());
        assertEquals(reservedUntil, h.getReservedUntil());
        assertEquals(externalBookingReference, h.getExternalBookingReference());
        assertNull(h.getErrorMessage());
        assertEquals(createdAt, h.getCreatedAt());
        assertEquals(updatedAt, h.getUpdatedAt());
    }

    @Test
    @DisplayName("Should set holdId field")
    void testSetHoldId() {
        // Act
        hold.setHoldId("hold-456");

        // Assert
        assertEquals("hold-456", hold.getHoldId());
    }

    @Test
    @DisplayName("Should set quoteId field")
    void testSetQuoteId() {
        // Act
        hold.setQuoteId("quote-123");

        // Assert
        assertEquals("quote-123", hold.getQuoteId());
    }

    @Test
    @DisplayName("Should set status field")
    void testSetStatus() {
        // Act
        hold.setStatus(Hold.HoldStatus.HELD);

        // Assert
        assertEquals(Hold.HoldStatus.HELD, hold.getStatus());
    }

    @Test
    @DisplayName("Should set reservedUntil field")
    void testSetReservedUntil() {
        // Arrange
        Instant reservedUntil = Instant.now().plusSeconds(900);

        // Act
        hold.setReservedUntil(reservedUntil);

        // Assert
        assertEquals(reservedUntil, hold.getReservedUntil());
    }

    @Test
    @DisplayName("Should set externalBookingReference field")
    void testSetExternalBookingReference() {
        // Act
        hold.setExternalBookingReference("booking-ref-123");

        // Assert
        assertEquals("booking-ref-123", hold.getExternalBookingReference());
    }

    @Test
    @DisplayName("Should set errorMessage field")
    void testSetErrorMessage() {
        // Act
        hold.setErrorMessage("Backend service unavailable");

        // Assert
        assertEquals("Backend service unavailable", hold.getErrorMessage());
    }

    @Test
    @DisplayName("Should set createdAt field")
    void testSetCreatedAt() {
        // Arrange
        Instant now = Instant.now();

        // Act
        hold.setCreatedAt(now);

        // Assert
        assertEquals(now, hold.getCreatedAt());
    }

    @Test
    @DisplayName("Should set updatedAt field")
    void testSetUpdatedAt() {
        // Arrange
        Instant now = Instant.now();

        // Act
        hold.setUpdatedAt(now);

        // Assert
        assertEquals(now, hold.getUpdatedAt());
    }

    @Test
    @DisplayName("Should automatically set createdAt and updatedAt on creation if null")
    void testOnCreateSetsTimestamps() {
        // Arrange
        hold.setHoldId("hold-123");
        hold.setQuoteId("quote-456");

        // Act
        hold.onCreate();

        // Assert
        assertNotNull(hold.getCreatedAt());
        assertNotNull(hold.getUpdatedAt());
        assertTrue(hold.getCreatedAt().isBefore(Instant.now().plusSeconds(1)));
        assertTrue(hold.getUpdatedAt().isBefore(Instant.now().plusSeconds(1)));
    }

    @Test
    @DisplayName("Should not override createdAt if already set on creation")
    void testOnCreateDoesNotOverrideExistingCreatedAt() {
        // Arrange
        Instant originalCreatedAt = Instant.now().minusSeconds(100);
        hold.setCreatedAt(originalCreatedAt);

        // Act
        hold.onCreate();

        // Assert
        assertEquals(originalCreatedAt, hold.getCreatedAt());
    }

    @Test
    @DisplayName("Should set updatedAt even if createdAt exists")
    void testOnCreateSetsUpdatedAtWhenCreatedAtExists() {
        // Arrange
        Instant originalCreatedAt = Instant.now().minusSeconds(100);
        hold.setCreatedAt(originalCreatedAt);

        // Act
        hold.onCreate();

        // Assert
        assertEquals(originalCreatedAt, hold.getCreatedAt());
        assertNotNull(hold.getUpdatedAt());
    }

    @Test
    @DisplayName("Should update updatedAt on modification")
    void testOnUpdateUpdatesTimestamp() {
        // Arrange
        Instant originalUpdatedAt = Instant.now().minusSeconds(100);
        hold.setUpdatedAt(originalUpdatedAt);

        // Act
        hold.onUpdate();

        // Assert
        assertNotEquals(originalUpdatedAt, hold.getUpdatedAt());
        assertTrue(hold.getUpdatedAt().isAfter(originalUpdatedAt));
    }

    @Test
    @DisplayName("Should construct Hold with all arguments constructor")
    void testAllArgsConstructor() {
        // Arrange
        String holdId = "hold-789";
        String quoteId = "quote-101";
        Hold.HoldStatus status = Hold.HoldStatus.CONFIRMED;
        Instant reservedUntil = Instant.now().plusSeconds(1800);
        String externalBookingReference = "booking-ref-456";
        String errorMessage = null;
        Instant createdAt = Instant.now().minusSeconds(60);
        Instant updatedAt = Instant.now();

        // Act
        Hold h = new Hold(holdId, quoteId, status, reservedUntil, 
                          externalBookingReference, errorMessage, createdAt, updatedAt);

        // Assert
        assertEquals(holdId, h.getHoldId());
        assertEquals(quoteId, h.getQuoteId());
        assertEquals(status, h.getStatus());
        assertEquals(reservedUntil, h.getReservedUntil());
        assertEquals(externalBookingReference, h.getExternalBookingReference());
        assertNull(h.getErrorMessage());
        assertEquals(createdAt, h.getCreatedAt());
        assertEquals(updatedAt, h.getUpdatedAt());
    }

    @Test
    @DisplayName("Should create Hold with no-args constructor")
    void testNoArgsConstructor() {
        // Act
        Hold h = new Hold();

        // Assert
        assertNull(h.getHoldId());
        assertNull(h.getQuoteId());
        assertNull(h.getStatus());
        assertNull(h.getReservedUntil());
        assertNull(h.getExternalBookingReference());
        assertNull(h.getErrorMessage());
        assertNull(h.getCreatedAt());
        assertNull(h.getUpdatedAt());
    }

    @Test
    @DisplayName("Should support equals and hashCode")
    void testEqualsAndHashCode() {
        // Arrange
        String holdId = "hold-100";
        Hold hold1 = Hold.builder()
                .holdId(holdId)
                .quoteId("quote-200")
                .status(Hold.HoldStatus.HELD)
                .reservedUntil(Instant.now().plusSeconds(900))
                .build();

        Hold hold2 = Hold.builder()
                .holdId(holdId)
                .quoteId("quote-200")
                .status(Hold.HoldStatus.HELD)
                .reservedUntil(Instant.now().plusSeconds(900))
                .build();

        // Act & Assert
        assertEquals(hold1, hold2);
        assertEquals(hold1.hashCode(), hold2.hashCode());
    }

    @Test
    @DisplayName("Should have proper toString representation")
    void testToString() {
        // Arrange
        hold.setHoldId("hold-123");
        hold.setQuoteId("quote-456");
        hold.setStatus(Hold.HoldStatus.HELD);

        // Act
        String toString = hold.toString();

        // Assert
        assertNotNull(toString);
        assertFalse(toString.isEmpty());
        assertTrue(toString.contains("hold-123") || toString.contains("holdId"));
    }

    @Test
    @DisplayName("Should have all HoldStatus enum values")
    void testHoldStatusEnumValues() {
        // Act & Assert
        assertNotNull(Hold.HoldStatus.HELD);
        assertNotNull(Hold.HoldStatus.EXPIRED);
        assertNotNull(Hold.HoldStatus.CONFIRMED);
        assertNotNull(Hold.HoldStatus.RELEASED);
        assertNotNull(Hold.HoldStatus.CONFIRMATION_FAILED);
    }

    @Test
    @DisplayName("Should transition from HELD to EXPIRED")
    void testHoldStatusTransitionHeldToExpired() {
        // Act
        hold.setStatus(Hold.HoldStatus.HELD);
        hold.setStatus(Hold.HoldStatus.EXPIRED);

        // Assert
        assertEquals(Hold.HoldStatus.EXPIRED, hold.getStatus());
    }

    @Test
    @DisplayName("Should transition from HELD to CONFIRMED")
    void testHoldStatusTransitionHeldToConfirmed() {
        // Act
        hold.setStatus(Hold.HoldStatus.HELD);
        hold.setStatus(Hold.HoldStatus.CONFIRMED);

        // Assert
        assertEquals(Hold.HoldStatus.CONFIRMED, hold.getStatus());
    }

    @Test
    @DisplayName("Should transition from HELD to RELEASED")
    void testHoldStatusTransitionHeldToReleased() {
        // Act
        hold.setStatus(Hold.HoldStatus.HELD);
        hold.setStatus(Hold.HoldStatus.RELEASED);

        // Assert
        assertEquals(Hold.HoldStatus.RELEASED, hold.getStatus());
    }

    @Test
    @DisplayName("Should transition from HELD to CONFIRMATION_FAILED")
    void testHoldStatusTransitionHeldToConfirmationFailed() {
        // Act
        hold.setStatus(Hold.HoldStatus.HELD);
        hold.setStatus(Hold.HoldStatus.CONFIRMATION_FAILED);

        // Assert
        assertEquals(Hold.HoldStatus.CONFIRMATION_FAILED, hold.getStatus());
    }

    @Test
    @DisplayName("Should handle null externalBookingReference")
    void testNullExternalBookingReference() {
        // Act
        hold.setExternalBookingReference(null);

        // Assert
        assertNull(hold.getExternalBookingReference());
    }

    @Test
    @DisplayName("Should handle null errorMessage")
    void testNullErrorMessage() {
        // Act
        hold.setErrorMessage(null);

        // Assert
        assertNull(hold.getErrorMessage());
    }

    @Test
    @DisplayName("Should handle long error messages")
    void testLongErrorMessage() {
        // Arrange
        String longError = "Error: ".repeat(100);

        // Act
        hold.setErrorMessage(longError);

        // Assert
        assertEquals(longError, hold.getErrorMessage());
        assertTrue(hold.getErrorMessage().length() > 100);
    }

    @Test
    @DisplayName("Should verify 15-minute hold duration")
    void testFifteenMinuteHoldDuration() {
        // Arrange
        Instant now = Instant.now();
        Instant reservedUntil = now.plusSeconds(900); // 15 minutes = 900 seconds
        hold.setReservedUntil(reservedUntil);

        // Act & Assert
        long duration = hold.getReservedUntil().getEpochSecond() - now.getEpochSecond();
        assertEquals(900L, duration, 1);
    }

    @Test
    @DisplayName("Should handle very long external booking references")
    void testLongExternalBookingReference() {
        // Arrange
        String longRef = "BOOKING-" + "A".repeat(240);

        // Act
        hold.setExternalBookingReference(longRef);

        // Assert
        assertEquals(longRef, hold.getExternalBookingReference());
    }

    @Test
    @DisplayName("Should verify createdAt is immutable after creation")
    void testCreatedAtImmutability() {
        // Arrange
        Instant originalCreatedAt = Instant.now().minusSeconds(100);
        hold.setCreatedAt(originalCreatedAt);

        // Act
        hold.onCreate();

        // Assert
        assertEquals(originalCreatedAt, hold.getCreatedAt());
    }

    @Test
    @DisplayName("Should verify updatedAt is mutable")
    void testUpdatedAtMutability() {
        // Arrange
        Instant original = Instant.now();
        hold.setUpdatedAt(original);

        // Act
        hold.setUpdatedAt(original.plusSeconds(100));

        // Assert
        assertNotEquals(original, hold.getUpdatedAt());
    }

    @Test
    @DisplayName("Should verify reservedUntil is in the future")
    void testReservedUntilInFuture() {
        // Arrange
        Instant now = Instant.now();
        Instant reservedUntil = now.plusSeconds(900);
        hold.setReservedUntil(reservedUntil);

        // Act & Assert
        assertTrue(hold.getReservedUntil().isAfter(now));
    }

    @Test
    @DisplayName("Should handle reservedUntil in the past (edge case)")
    void testReservedUntilInPast() {
        // Arrange
        Instant now = Instant.now();
        Instant pastTime = now.minusSeconds(100);

        // Act
        hold.setReservedUntil(pastTime);

        // Assert
        assertTrue(hold.getReservedUntil().isBefore(now));
    }

    @Test
    @DisplayName("Should allow setting HoldStatus to all valid values")
    void testAllHoldStatusValues() {
        // Arrange
        Hold.HoldStatus[] statuses = {
                Hold.HoldStatus.HELD,
                Hold.HoldStatus.EXPIRED,
                Hold.HoldStatus.CONFIRMED,
                Hold.HoldStatus.RELEASED,
                Hold.HoldStatus.CONFIRMATION_FAILED
        };

        // Act & Assert
        for (Hold.HoldStatus status : statuses) {
            hold.setStatus(status);
            assertEquals(status, hold.getStatus());
        }
    }

    @Test
    @DisplayName("Should test equality with different statuses")
    void testEqualityWithDifferentStatus() {
        // Arrange
        Hold hold1 = Hold.builder()
                .holdId("hold-100")
                .quoteId("quote-200")
                .status(Hold.HoldStatus.HELD)
                .build();

        Hold hold2 = Hold.builder()
                .holdId("hold-100")
                .quoteId("quote-200")
                .status(Hold.HoldStatus.CONFIRMED)
                .build();

        // Act & Assert
        assertNotEquals(hold1, hold2);
    }

    @Test
    @DisplayName("Should verify timestamps are independent")
    void testTimestampsAreIndependent() {
        // Arrange
        Instant createdAt = Instant.now().minusSeconds(1000);
        Instant updatedAt = Instant.now();
        hold.setCreatedAt(createdAt);
        hold.setUpdatedAt(updatedAt);

        // Act & Assert
        assertNotEquals(hold.getCreatedAt(), hold.getUpdatedAt());
        assertTrue(hold.getUpdatedAt().isAfter(hold.getCreatedAt()));
    }
}
