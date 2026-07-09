package com.galaxium.holdservice.repository;

import com.galaxium.holdservice.domain.Hold;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class HoldRepositoryTest {

    @Autowired
    private HoldRepository holdRepository;

    @BeforeEach
    void setUp() {
        holdRepository.deleteAll();
    }

    // --- save and findById ---

    @Test
    void shouldPersistAndFindHoldById() {
        Hold hold = buildHold("H-2025-000001", Hold.HoldStatus.HELD, futureDate(15));
        holdRepository.save(hold);

        Optional<Hold> found = holdRepository.findById("H-2025-000001");

        assertThat(found).isPresent();
        assertThat(found.get().getHoldId()).isEqualTo("H-2025-000001");
    }

    @Test
    void shouldReturnEmptyOptional_whenHoldDoesNotExist() {
        Optional<Hold> found = holdRepository.findById("H-9999-999999");

        assertThat(found).isEmpty();
    }

    @Test
    void shouldPersistAllFields() {
        Date reservedUntil = futureDate(15);
        Hold hold = buildHold("H-2025-000001", Hold.HoldStatus.HELD, reservedUntil);
        hold.setExternalBookingReference("BKG-XYZ-001");
        hold.setErrorMessage("some error");

        holdRepository.save(hold);
        Hold found = holdRepository.findById("H-2025-000001").get();

        assertThat(found.getQuoteId()).isEqualTo("Q-2025-000001");
        assertThat(found.getStatus()).isEqualTo(Hold.HoldStatus.HELD);
        assertThat(found.getReservedUntil()).isEqualTo(reservedUntil);
        assertThat(found.getExternalBookingReference()).isEqualTo("BKG-XYZ-001");
        assertThat(found.getErrorMessage()).isEqualTo("some error");
    }

    // --- findAll ---

    @Test
    void shouldReturnAllPersistedHolds() {
        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD, futureDate(15)));
        holdRepository.save(buildHold("H-2025-000002", Hold.HoldStatus.CONFIRMED, futureDate(15)));

        List<Hold> all = holdRepository.findAll();

        assertThat(all).hasSize(2)
                .extracting(Hold::getHoldId)
                .containsExactlyInAnyOrder("H-2025-000001", "H-2025-000002");
    }

    @Test
    void shouldReturnEmptyList_whenNoHoldsPersisted() {
        assertThat(holdRepository.findAll()).isEmpty();
    }

    // --- delete ---

    @Test
    void shouldDeleteHoldById() {
        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD, futureDate(15)));

        holdRepository.deleteById("H-2025-000001");

        assertThat(holdRepository.findById("H-2025-000001")).isEmpty();
    }

    // --- @PrePersist timestamps ---

    @Test
    void shouldPopulateCreatedAtAndUpdatedAt_onSave() {
        Date before = new Date();
        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD, futureDate(15)));
        Date after = new Date();

        Hold found = holdRepository.findById("H-2025-000001").get();

        assertThat(found.getCreatedAt())
                .isNotNull()
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
        assertThat(found.getUpdatedAt())
                .isNotNull()
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
    }

    // --- findExpiredHolds custom JPQL query ---

    @Test
    void findExpiredHolds_shouldReturnNothing_whenNoHoldsExist() {
        List<Hold> expired = holdRepository.findExpiredHolds(new Date());

        assertThat(expired).isEmpty();
    }

    @Test
    void findExpiredHolds_shouldReturnNothing_whenAllHoldsAreFuture() {
        // reservedUntil is 15 minutes in the future — not expired
        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD, futureDate(15)));

        List<Hold> expired = holdRepository.findExpiredHolds(new Date());

        assertThat(expired).isEmpty();
    }

    @Test
    void findExpiredHolds_shouldReturnHold_whenReservedUntilIsInPast() {
        // reservedUntil is 1 minute in the past — expired
        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD, pastDate(1)));

        List<Hold> expired = holdRepository.findExpiredHolds(new Date());

        assertThat(expired).hasSize(1);
        assertThat(expired.get(0).getHoldId()).isEqualTo("H-2025-000001");
    }

    @Test
    void findExpiredHolds_shouldOnlyReturnHeldStatus_notConfirmedOrReleased() {
        // Only HELD status is included in the JPQL query predicate
        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD,      pastDate(1)));
        holdRepository.save(buildHold("H-2025-000002", Hold.HoldStatus.CONFIRMED, pastDate(1)));
        holdRepository.save(buildHold("H-2025-000003", Hold.HoldStatus.RELEASED,  pastDate(1)));
        holdRepository.save(buildHold("H-2025-000004", Hold.HoldStatus.EXPIRED,   pastDate(1)));

        List<Hold> expired = holdRepository.findExpiredHolds(new Date());

        assertThat(expired).hasSize(1);
        assertThat(expired.get(0).getHoldId()).isEqualTo("H-2025-000001");
    }

    @Test
    void findExpiredHolds_shouldReturnMultipleExpiredHeldHolds() {
        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD, pastDate(5)));
        holdRepository.save(buildHold("H-2025-000002", Hold.HoldStatus.HELD, pastDate(10)));
        holdRepository.save(buildHold("H-2025-000003", Hold.HoldStatus.HELD, futureDate(15)));

        List<Hold> expired = holdRepository.findExpiredHolds(new Date());

        assertThat(expired).hasSize(2)
                .extracting(Hold::getHoldId)
                .containsExactlyInAnyOrder("H-2025-000001", "H-2025-000002");
    }

    @Test
    void findExpiredHolds_shouldExcludeHoldExpiredExactlyAtNow() {
        // A hold expiring at the exact "now" boundary is not yet returned because
        // the query uses strict less-than: reservedUntil < :now
        Date nowMinus1ms = new Date(System.currentTimeMillis() - 1);
        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD, nowMinus1ms));

        // Query with a date 2 ms in the future — the hold is past that boundary
        Date queryTime = new Date(System.currentTimeMillis() + 2);
        List<Hold> expired = holdRepository.findExpiredHolds(queryTime);

        assertThat(expired).hasSize(1);
    }

    // --- exists / count ---

    @Test
    void shouldReturnCorrectCount() {
        assertThat(holdRepository.count()).isEqualTo(0);

        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD, futureDate(15)));

        assertThat(holdRepository.count()).isEqualTo(1);
    }

    @Test
    void shouldReturnTrue_whenHoldExists() {
        holdRepository.save(buildHold("H-2025-000001", Hold.HoldStatus.HELD, futureDate(15)));

        assertThat(holdRepository.existsById("H-2025-000001")).isTrue();
    }

    @Test
    void shouldReturnFalse_whenHoldDoesNotExist() {
        assertThat(holdRepository.existsById("H-9999-999999")).isFalse();
    }

    // --- Helpers ---

    private Hold buildHold(String holdId, Hold.HoldStatus status, Date reservedUntil) {
        Hold h = new Hold();
        h.setHoldId(holdId);
        h.setQuoteId("Q-2025-000001");
        h.setStatus(status);
        h.setReservedUntil(reservedUntil);
        return h;
    }

    private Date futureDate(int minutes) {
        return new Date(System.currentTimeMillis() + (long) minutes * 60_000L);
    }

    private Date pastDate(int minutes) {
        return new Date(System.currentTimeMillis() - (long) minutes * 60_000L);
    }
}
