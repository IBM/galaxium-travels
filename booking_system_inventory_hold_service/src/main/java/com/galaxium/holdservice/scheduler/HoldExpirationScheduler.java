package com.galaxium.holdservice.scheduler;

import com.galaxium.holdservice.domain.AuditEvent;
import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.HoldRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class HoldExpirationScheduler {

    private final HoldRepository holdRepository;
    private final AuditEventRepository auditEventRepository;

    @Scheduled(fixedDelayString = "${hold.expiration.check.interval.seconds:60}000")
    @Transactional
    public void expireHolds() {
        Instant now = Instant.now();
        List<Hold> expiredHolds = holdRepository.findExpiredHolds(now);

        if (!expiredHolds.isEmpty()) {
            log.info("Found {} expired holds to process", expiredHolds.size());

            for (Hold hold : expiredHolds) {
                hold.setStatus(Hold.HoldStatus.EXPIRED);
                holdRepository.save(hold);

                // Create audit event
                AuditEvent event = AuditEvent.builder()
                        .entityType("HOLD")
                        .entityId(hold.getHoldId())
                        .eventType("EXPIRED")
                        .details(String.format("Hold expired at %s", now))
                        .build();
                auditEventRepository.save(event);

                log.info("Hold {} marked as expired", hold.getHoldId());
            }

            log.info("Processed {} expired holds", expiredHolds.size());
        }
    }
}

// Made with Bob
