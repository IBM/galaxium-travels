package com.galaxium.holdservice.service;

import com.galaxium.holdservice.client.PythonBackendClient;
import com.galaxium.holdservice.domain.AuditEvent;
import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.HoldRepository;
import com.galaxium.holdservice.repository.QuoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HoldServiceTest {

    @Mock
    private HoldRepository holdRepository;

    @Mock
    private QuoteRepository quoteRepository;

    @Mock
    private AuditEventRepository auditEventRepository;

    @Mock
    private PythonBackendClient pythonBackendClient;

    @InjectMocks
    private HoldService holdService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(holdService, "holdDurationMinutes", 15);
    }

    // ------------------------------------------------------------------ helpers

    private Quote activeQuote(String quoteId) {
        Quote q = new Quote();
        q.setQuoteId(quoteId);
        q.setFlightId(1);
        q.setSeatClass("economy");
        q.setQuantity(2);
        q.setTravelerId(10);
        q.setTravelerName("Bob");
        // expires one hour from now
        q.setExpiresAt(new Date(System.currentTimeMillis() + 60 * 60 * 1000L));
        return q;
    }

    private Quote expiredQuote(String quoteId) {
        Quote q = activeQuote(quoteId);
        // expired one minute ago
        q.setExpiresAt(new Date(System.currentTimeMillis() - 60 * 1000L));
        return q;
    }

    private Hold heldHold(String holdId, String quoteId) {
        Hold h = new Hold();
        h.setHoldId(holdId);
        h.setQuoteId(quoteId);
        h.setStatus(Hold.HoldStatus.HELD);
        // not expired
        h.setReservedUntil(new Date(System.currentTimeMillis() + 15 * 60 * 1000L));
        return h;
    }

    private Hold expiredHold(String holdId, String quoteId) {
        Hold h = heldHold(holdId, quoteId);
        // expired one minute ago
        h.setReservedUntil(new Date(System.currentTimeMillis() - 60 * 1000L));
        return h;
    }

    // ================================================================ createHold

    @Test
    void shouldCreateHoldWithHeldStatus_whenQuoteIsValid() {
        when(quoteRepository.findById("Q-1")).thenReturn(Optional.of(activeQuote("Q-1")));
        when(holdRepository.count()).thenReturn(0L);
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        Hold result = holdService.createHold("Q-1");

        assertThat(result.getStatus()).isEqualTo(Hold.HoldStatus.HELD);
        assertThat(result.getQuoteId()).isEqualTo("Q-1");
    }

    @Test
    void shouldSetReservedUntilApproxNowPlus15Min_whenCreatingHold() {
        when(quoteRepository.findById("Q-1")).thenReturn(Optional.of(activeQuote("Q-1")));
        when(holdRepository.count()).thenReturn(0L);
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        long before = System.currentTimeMillis();
        Hold result = holdService.createHold("Q-1");
        long after = System.currentTimeMillis();

        long reservedUntil = result.getReservedUntil().getTime();
        assertThat(reservedUntil).isBetween(
                before + 14 * 60 * 1000L,
                after  + 16 * 60 * 1000L);
    }

    @Test
    void shouldSaveHold_whenCreatingHold() {
        when(quoteRepository.findById("Q-1")).thenReturn(Optional.of(activeQuote("Q-1")));
        when(holdRepository.count()).thenReturn(0L);
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        holdService.createHold("Q-1");

        verify(holdRepository, times(1)).save(any(Hold.class));
    }

    @Test
    void shouldCreateAuditEvent_whenCreatingHold() {
        when(quoteRepository.findById("Q-1")).thenReturn(Optional.of(activeQuote("Q-1")));
        when(holdRepository.count()).thenReturn(0L);
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        holdService.createHold("Q-1");

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("CREATED");
        assertThat(captor.getValue().getEntityType()).isEqualTo("HOLD");
    }

    @Test
    void shouldThrowIllegalArgumentException_whenQuoteNotFound() {
        when(quoteRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> holdService.createHold("MISSING"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MISSING");
    }

    @Test
    void shouldThrowIllegalStateException_whenQuoteIsExpired() {
        when(quoteRepository.findById("Q-EXP")).thenReturn(Optional.of(expiredQuote("Q-EXP")));

        assertThatThrownBy(() -> holdService.createHold("Q-EXP"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("expired");
    }

    // =================================================================== getHold

    @Test
    void shouldReturnHold_whenHoldExists() {
        Hold hold = heldHold("H-1", "Q-1");
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));

        Hold result = holdService.getHold("H-1");

        assertThat(result).isSameAs(hold);
    }

    @Test
    void shouldReturnNull_whenHoldNotFound() {
        when(holdRepository.findById("MISSING")).thenReturn(Optional.empty());

        Hold result = holdService.getHold("MISSING");

        assertThat(result).isNull();
    }

    // ================================================================ confirmHold

    @Test
    void shouldConfirmHold_whenHoldIsHeldAndNotExpired() {
        Hold hold = heldHold("H-1", "Q-1");
        Quote quote = activeQuote("Q-1");
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));
        when(quoteRepository.findById("Q-1")).thenReturn(Optional.of(quote));
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        PythonBackendClient.BookingResponse booking = new PythonBackendClient.BookingResponse();
        booking.setBookingId(99);
        when(pythonBackendClient.createBookingFromHold(any())).thenReturn(booking);

        Hold result = holdService.confirmHold("H-1");

        assertThat(result.getStatus()).isEqualTo(Hold.HoldStatus.CONFIRMED);
        assertThat(result.getExternalBookingReference()).isEqualTo("99");
    }

    @Test
    void shouldCallPythonBackend_whenConfirmingHold() {
        Hold hold = heldHold("H-1", "Q-1");
        Quote quote = activeQuote("Q-1");
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));
        when(quoteRepository.findById("Q-1")).thenReturn(Optional.of(quote));
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        PythonBackendClient.BookingResponse booking = new PythonBackendClient.BookingResponse();
        booking.setBookingId(99);
        when(pythonBackendClient.createBookingFromHold(any())).thenReturn(booking);

        holdService.confirmHold("H-1");

        verify(pythonBackendClient, times(1)).createBookingFromHold(any());
    }

    @Test
    void shouldReturnImmediately_whenHoldAlreadyConfirmed() {
        Hold hold = heldHold("H-1", "Q-1");
        hold.setStatus(Hold.HoldStatus.CONFIRMED);
        hold.setExternalBookingReference("42");
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));

        Hold result = holdService.confirmHold("H-1");

        assertThat(result.getStatus()).isEqualTo(Hold.HoldStatus.CONFIRMED);
        verify(pythonBackendClient, never()).createBookingFromHold(any());
    }

    @Test
    void shouldThrowIllegalStateException_whenHoldStatusIsNotHeld() {
        Hold hold = heldHold("H-1", "Q-1");
        hold.setStatus(Hold.HoldStatus.RELEASED);
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));

        assertThatThrownBy(() -> holdService.confirmHold("H-1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("HELD");
    }

    @Test
    void shouldExpireHoldAndThrow_whenReservedUntilHasPassed() {
        Hold hold = expiredHold("H-EXP", "Q-1");
        when(holdRepository.findById("H-EXP")).thenReturn(Optional.of(hold));
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> holdService.confirmHold("H-EXP"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("expired");

        assertThat(hold.getStatus()).isEqualTo(Hold.HoldStatus.EXPIRED);
    }

    @Test
    void shouldThrowIllegalArgumentException_whenHoldNotFoundOnConfirm() {
        when(holdRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> holdService.confirmHold("MISSING"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MISSING");
    }

    @Test
    void shouldThrowIllegalStateException_whenQuoteMissingAtConfirmTime() {
        Hold hold = heldHold("H-1", "Q-GONE");
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));
        when(quoteRepository.findById("Q-GONE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> holdService.confirmHold("H-1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Q-GONE");
    }

    @Test
    void shouldSetConfirmationFailedAndThrow_whenPythonBackendFails() {
        Hold hold = heldHold("H-1", "Q-1");
        Quote quote = activeQuote("Q-1");
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));
        when(quoteRepository.findById("Q-1")).thenReturn(Optional.of(quote));
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));
        when(pythonBackendClient.createBookingFromHold(any()))
                .thenThrow(new PythonBackendClient.BookingCreationException("backend down"));

        assertThatThrownBy(() -> holdService.confirmHold("H-1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("backend down");

        assertThat(hold.getStatus()).isEqualTo(Hold.HoldStatus.CONFIRMATION_FAILED);
        assertThat(hold.getErrorMessage()).contains("backend down");
    }

    // ================================================================ releaseHold

    @Test
    void shouldReleaseHold_whenHoldIsHeld() {
        Hold hold = heldHold("H-1", "Q-1");
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        Hold result = holdService.releaseHold("H-1");

        assertThat(result.getStatus()).isEqualTo(Hold.HoldStatus.RELEASED);
    }

    @Test
    void shouldCreateAuditEvent_whenReleasingHold() {
        Hold hold = heldHold("H-1", "Q-1");
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));
        when(holdRepository.save(any(Hold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        holdService.releaseHold("H-1");

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("RELEASED");
    }

    @Test
    void shouldThrowIllegalArgumentException_whenHoldNotFoundOnRelease() {
        when(holdRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> holdService.releaseHold("MISSING"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MISSING");
    }

    @Test
    void shouldThrowIllegalStateException_whenHoldIsNotHeldOnRelease() {
        Hold hold = heldHold("H-1", "Q-1");
        hold.setStatus(Hold.HoldStatus.CONFIRMED);
        when(holdRepository.findById("H-1")).thenReturn(Optional.of(hold));

        assertThatThrownBy(() -> holdService.releaseHold("H-1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cannot be released");
    }
}
