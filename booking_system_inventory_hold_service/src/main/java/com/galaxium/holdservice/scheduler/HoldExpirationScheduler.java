package com.galaxium.holdservice.scheduler;

import com.galaxium.holdservice.domain.AuditEvent;
import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.HoldRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Component
public class HoldExpirationScheduler {

    private static final Logger log = LoggerFactory.getLogger(HoldExpirationScheduler.class);

    @Autowired
    private HoldRepository holdRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Scheduled(fixedDelayString = "${hold.expiration.check.interval.seconds:60}000")
    @Transactional
    public void expireHolds() {
        Date now = new Date();
        List<Hold> expiredHolds = holdRepository.findExpiredHolds(now);

        if (!expiredHolds.isEmpty()) {
            log.info("Found " + expiredHolds.size() + " expired holds to process");

            for (Hold hold : expiredHolds) {
                hold.setStatus(Hold.HoldStatus.EXPIRED);
                holdRepository.save(hold);

                // Create audit event
                AuditEvent event = new AuditEvent();
                event.setEntityType("HOLD");
                event.setEntityId(hold.getHoldId());
                event.setEventType("EXPIRED");
                event.setDetails("Hold expired at " + now);
                auditEventRepository.save(event);

                log.info("Hold " + hold.getHoldId() + " marked as expired");
            }

            log.info("Processed " + expiredHolds.size() + " expired holds");
        }
    }
}

// Made with Bob
