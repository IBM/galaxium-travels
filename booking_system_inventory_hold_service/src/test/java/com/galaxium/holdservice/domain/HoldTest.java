package com.galaxium.holdservice.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

class HoldTest {

    private Hold hold;

    @BeforeEach
    void setUp() {
        hold = new Hold();
    }

    // --- getters / setters ---

    @Test
    void shouldStoreAndReturnHoldId() {
        hold.setHoldId("H-2024-000001");
        assertThat(hold.getHoldId()).isEqualTo("H-2024-000001");
    }

    @Test
    void shouldStoreAndReturnQuoteId() {
        hold.setQuoteId("Q-2024-000001");
        assertThat(hold.getQuoteId()).isEqualTo("Q-2024-000001");
    }

    @Test
    void shouldStoreAndReturnStatus_held() {
        hold.setStatus(Hold.HoldStatus.HELD);
        assertThat(hold.getStatus()).isEqualTo(Hold.HoldStatus.HELD);
    }

    @Test
    void shouldStoreAndReturnStatus_confirmed() {
        hold.setStatus(Hold.HoldStatus.CONFIRMED);
        assertThat(hold.getStatus()).isEqualTo(Hold.HoldStatus.CONFIRMED);
    }

    @Test
    void shouldStoreAndReturnStatus_released() {
        hold.setStatus(Hold.HoldStatus.RELEASED);
        assertThat(hold.getStatus()).isEqualTo(Hold.HoldStatus.RELEASED);
    }

    @Test
    void shouldStoreAndReturnStatus_expired() {
        hold.setStatus(Hold.HoldStatus.EXPIRED);
        assertThat(hold.getStatus()).isEqualTo(Hold.HoldStatus.EXPIRED);
    }

    @Test
    void shouldStoreAndReturnStatus_confirmationFailed() {
        hold.setStatus(Hold.HoldStatus.CONFIRMATION_FAILED);
        assertThat(hold.getStatus()).isEqualTo(Hold.HoldStatus.CONFIRMATION_FAILED);
    }

    @Test
    void shouldStoreAndReturnReservedUntil() {
        Date reservedUntil = new Date(System.currentTimeMillis() + 900_000L);
        hold.setReservedUntil(reservedUntil);
        assertThat(hold.getReservedUntil()).isEqualTo(reservedUntil);
    }

    @Test
    void shouldStoreAndReturnExternalBookingReference() {
        hold.setExternalBookingReference("BKG-XYZ-9999");
        assertThat(hold.getExternalBookingReference()).isEqualTo("BKG-XYZ-9999");
    }

    @Test
    void shouldAllowNullExternalBookingReference() {
        hold.setExternalBookingReference(null);
        assertThat(hold.getExternalBookingReference()).isNull();
    }

    @Test
    void shouldStoreAndReturnErrorMessage() {
        hold.setErrorMessage("Python backend returned 503");
        assertThat(hold.getErrorMessage()).isEqualTo("Python backend returned 503");
    }

    @Test
    void shouldAllowNullErrorMessage() {
        hold.setErrorMessage(null);
        assertThat(hold.getErrorMessage()).isNull();
    }

    @Test
    void shouldStoreAndReturnCreatedAt() {
        Date now = new Date();
        hold.setCreatedAt(now);
        assertThat(hold.getCreatedAt()).isEqualTo(now);
    }

    @Test
    void shouldStoreAndReturnUpdatedAt() {
        Date now = new Date();
        hold.setUpdatedAt(now);
        assertThat(hold.getUpdatedAt()).isEqualTo(now);
    }

    // --- HoldStatus enum ---

    @Test
    void holdStatusEnum_shouldContainAllExpectedValues() {
        Hold.HoldStatus[] values = Hold.HoldStatus.values();
        assertThat(values).containsExactlyInAnyOrder(
                Hold.HoldStatus.HELD,
                Hold.HoldStatus.EXPIRED,
                Hold.HoldStatus.CONFIRMED,
                Hold.HoldStatus.RELEASED,
                Hold.HoldStatus.CONFIRMATION_FAILED
        );
    }

    @Test
    void holdStatusEnum_shouldResolveByName() {
        assertThat(Hold.HoldStatus.valueOf("HELD")).isEqualTo(Hold.HoldStatus.HELD);
        assertThat(Hold.HoldStatus.valueOf("EXPIRED")).isEqualTo(Hold.HoldStatus.EXPIRED);
        assertThat(Hold.HoldStatus.valueOf("CONFIRMED")).isEqualTo(Hold.HoldStatus.CONFIRMED);
        assertThat(Hold.HoldStatus.valueOf("RELEASED")).isEqualTo(Hold.HoldStatus.RELEASED);
        assertThat(Hold.HoldStatus.valueOf("CONFIRMATION_FAILED")).isEqualTo(Hold.HoldStatus.CONFIRMATION_FAILED);
    }

    // --- @PrePersist onCreate() ---

    @Test
    void onCreate_shouldSetCreatedAt_whenCreatedAtIsNull() {
        Date before = new Date();
        hold.onCreate();
        Date after = new Date();

        assertThat(hold.getCreatedAt())
                .isNotNull()
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
    }

    @Test
    void onCreate_shouldNotOverwriteCreatedAt_whenAlreadySet() {
        Date original = new Date(0L);
        hold.setCreatedAt(original);

        hold.onCreate();

        assertThat(hold.getCreatedAt()).isEqualTo(original);
    }

    @Test
    void onCreate_shouldSetUpdatedAt_whenUpdatedAtIsNull() {
        Date before = new Date();
        hold.onCreate();
        Date after = new Date();

        assertThat(hold.getUpdatedAt())
                .isNotNull()
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
    }

    @Test
    void onCreate_shouldNotOverwriteUpdatedAt_whenAlreadySet() {
        Date original = new Date(0L);
        hold.setUpdatedAt(original);

        hold.onCreate();

        assertThat(hold.getUpdatedAt()).isEqualTo(original);
    }

    @Test
    void onCreate_shouldSetBothTimestamps_withSameInstant() {
        hold.onCreate();

        // Both timestamps are derived from the same `new Date()` inside onCreate
        assertThat(hold.getCreatedAt()).isNotNull();
        assertThat(hold.getUpdatedAt()).isNotNull();
        // The two calls to new Date() are adjacent in code so the gap must be tiny
        assertThat(Math.abs(hold.getUpdatedAt().getTime() - hold.getCreatedAt().getTime()))
                .isLessThanOrEqualTo(100L);
    }

    // --- @PreUpdate onUpdate() ---

    @Test
    void onUpdate_shouldRefreshUpdatedAt() {
        Date original = new Date(0L);
        hold.setUpdatedAt(original);

        Date before = new Date();
        hold.onUpdate();
        Date after = new Date();

        assertThat(hold.getUpdatedAt())
                .isNotNull()
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
    }

    @Test
    void onUpdate_shouldNotChangeCreatedAt() {
        Date createdOriginal = new Date(0L);
        hold.setCreatedAt(createdOriginal);

        hold.onUpdate();

        assertThat(hold.getCreatedAt()).isEqualTo(createdOriginal);
    }

    @Test
    void onUpdate_shouldAlwaysOverwriteUpdatedAt() {
        // Even if updatedAt already has a value it must be replaced
        hold.setUpdatedAt(new Date(1_000_000L));

        hold.onUpdate();

        assertThat(hold.getUpdatedAt().getTime()).isGreaterThan(1_000_000L);
    }

    // --- default state after construction ---

    @Test
    void shouldHaveAllNullFieldsByDefault() {
        Hold fresh = new Hold();

        assertThat(fresh.getHoldId()).isNull();
        assertThat(fresh.getQuoteId()).isNull();
        assertThat(fresh.getStatus()).isNull();
        assertThat(fresh.getReservedUntil()).isNull();
        assertThat(fresh.getExternalBookingReference()).isNull();
        assertThat(fresh.getErrorMessage()).isNull();
        assertThat(fresh.getCreatedAt()).isNull();
        assertThat(fresh.getUpdatedAt()).isNull();
    }
}
