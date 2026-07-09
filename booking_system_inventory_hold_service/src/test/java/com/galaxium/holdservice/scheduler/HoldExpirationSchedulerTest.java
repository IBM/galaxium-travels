package com.galaxium.holdservice.scheduler;

import com.galaxium.holdservice.domain.AuditEvent;
import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.HoldRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HoldExpirationSchedulerTest {

    @Mock
    private HoldRepository holdRepository;

    @Mock
    private AuditEventRepository auditEventRepository;

    @InjectMocks
    private HoldExpirationScheduler scheduler;

    @Captor
    private ArgumentCaptor<Hold> holdCaptor;

    @Captor
    private ArgumentCaptor<AuditEvent> auditEventCaptor;

    private Hold buildHold(String holdId) {
        Hold hold = new Hold();
        hold.setHoldId(holdId);
        hold.setQuoteId("Q-2024-000001");
        hold.setStatus(Hold.HoldStatus.HELD);
        hold.setReservedUntil(new Date(System.currentTimeMillis() - 60_000)); // 1 min in the past
        return hold;
    }

    // -----------------------------------------------------------------------
    // No expired holds
    // -----------------------------------------------------------------------

    @Test
    void shouldNotSaveAnything_whenNoExpiredHoldsExist() {
        when(holdRepository.findExpiredHolds(any(Date.class)))
                .thenReturn(Collections.emptyList());

        scheduler.expireHolds();

        verify(holdRepository, never()).save(any(Hold.class));
        verify(auditEventRepository, never()).save(any(AuditEvent.class));
    }

    // -----------------------------------------------------------------------
    // One expired hold
    // -----------------------------------------------------------------------

    @Test
    void shouldMarkHoldExpired_whenOneExpiredHoldExists() {
        Hold hold = buildHold("H-2024-000001");
        when(holdRepository.findExpiredHolds(any(Date.class)))
                .thenReturn(Collections.singletonList(hold));

        scheduler.expireHolds();

        verify(holdRepository, times(1)).save(holdCaptor.capture());
        assertThat(holdCaptor.getValue().getStatus()).isEqualTo(Hold.HoldStatus.EXPIRED);
        assertThat(holdCaptor.getValue().getHoldId()).isEqualTo("H-2024-000001");
    }

    @Test
    void shouldCreateAuditEvent_whenOneExpiredHoldExists() {
        Hold hold = buildHold("H-2024-000001");
        when(holdRepository.findExpiredHolds(any(Date.class)))
                .thenReturn(Collections.singletonList(hold));

        scheduler.expireHolds();

        verify(auditEventRepository, times(1)).save(auditEventCaptor.capture());
        AuditEvent event = auditEventCaptor.getValue();
        assertThat(event.getEntityType()).isEqualTo("HOLD");
        assertThat(event.getEntityId()).isEqualTo("H-2024-000001");
        assertThat(event.getEventType()).isEqualTo("EXPIRED");
        assertThat(event.getDetails()).contains("Hold expired at");
    }

    // -----------------------------------------------------------------------
    // Multiple expired holds
    // -----------------------------------------------------------------------

    @Test
    void shouldMarkAllHoldsExpired_whenMultipleExpiredHoldsExist() {
        Hold hold1 = buildHold("H-2024-000001");
        Hold hold2 = buildHold("H-2024-000002");
        Hold hold3 = buildHold("H-2024-000003");
        List<Hold> expiredHolds = Arrays.asList(hold1, hold2, hold3);
        when(holdRepository.findExpiredHolds(any(Date.class))).thenReturn(expiredHolds);

        scheduler.expireHolds();

        verify(holdRepository, times(3)).save(holdCaptor.capture());
        List<Hold> savedHolds = holdCaptor.getAllValues();
        assertThat(savedHolds).hasSize(3);
        assertThat(savedHolds).allMatch(h -> h.getStatus() == Hold.HoldStatus.EXPIRED);
        assertThat(savedHolds).extracting(Hold::getHoldId)
                .containsExactlyInAnyOrder("H-2024-000001", "H-2024-000002", "H-2024-000003");
    }

    @Test
    void shouldCreateOneAuditEventPerExpiredHold_whenMultipleExpiredHoldsExist() {
        Hold hold1 = buildHold("H-2024-000001");
        Hold hold2 = buildHold("H-2024-000002");
        Hold hold3 = buildHold("H-2024-000003");
        when(holdRepository.findExpiredHolds(any(Date.class)))
                .thenReturn(Arrays.asList(hold1, hold2, hold3));

        scheduler.expireHolds();

        verify(auditEventRepository, times(3)).save(auditEventCaptor.capture());
        List<AuditEvent> events = auditEventCaptor.getAllValues();
        assertThat(events).hasSize(3);
        assertThat(events).allMatch(e -> "HOLD".equals(e.getEntityType()));
        assertThat(events).allMatch(e -> "EXPIRED".equals(e.getEventType()));
        assertThat(events).extracting(AuditEvent::getEntityId)
                .containsExactlyInAnyOrder("H-2024-000001", "H-2024-000002", "H-2024-000003");
    }
}
