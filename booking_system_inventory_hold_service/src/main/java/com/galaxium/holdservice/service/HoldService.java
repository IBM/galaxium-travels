package com.galaxium.holdservice.service;

import com.galaxium.holdservice.client.PythonBackendClient;
import com.galaxium.holdservice.domain.AuditEvent;
import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.HoldRepository;
import com.galaxium.holdservice.repository.QuoteRepository;
import org.apache.commons.text.StringSubstitutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class HoldService {

    private static final Logger log = LoggerFactory.getLogger(HoldService.class);

    @Autowired
    private HoldRepository holdRepository;

    @Autowired
    private QuoteRepository quoteRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private PythonBackendClient pythonBackendClient;

    @Value("${hold.duration.minutes:15}")
    private int holdDurationMinutes;

    @Transactional
    public Hold createHold(String quoteId) {
        log.info("Creating hold for quote " + quoteId);

        // Verify quote exists
        Quote quote = quoteRepository.findById(quoteId).orElse(null);
        if (quote == null) {
            throw new IllegalArgumentException("Quote not found: " + quoteId);
        }

        // Check if quote is expired
        if (quote.getExpiresAt().before(new Date())) {
            throw new IllegalStateException("Quote has expired");
        }

        // Generate hold ID
        String holdId = generateHoldId();

        // Calculate reservation deadline
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.MINUTE, holdDurationMinutes);

        // Create hold
        Hold hold = new Hold();
        hold.setHoldId(holdId);
        hold.setQuoteId(quoteId);
        hold.setStatus(Hold.HoldStatus.HELD);
        hold.setReservedUntil(cal.getTime());

        hold = holdRepository.save(hold);

        // Audit event
        Map<String, String> values = new HashMap<String, String>();
        values.put("quoteId", quoteId);
        values.put("reservedUntil", String.valueOf(hold.getReservedUntil()));
        createAuditEvent("HOLD", holdId, "CREATED",
                StringSubstitutor.replace("Hold created for quote ${quoteId}, expires at ${reservedUntil}", values));

        log.info("Hold " + holdId + " created successfully");
        return hold;
    }

    @Transactional(readOnly = true)
    public Hold getHold(String holdId) {
        return holdRepository.findById(holdId).orElse(null);
    }

    @Transactional
    public Hold confirmHold(String holdId) {
        log.info("Confirming hold " + holdId);

        Hold hold = holdRepository.findById(holdId).orElse(null);
        if (hold == null) {
            throw new IllegalArgumentException("Hold not found: " + holdId);
        }

        // Check if already confirmed
        if (hold.getStatus() == Hold.HoldStatus.CONFIRMED) {
            log.info("Hold " + holdId + " already confirmed, returning existing booking reference");
            return hold;
        }

        // Check if hold is still valid
        if (hold.getStatus() != Hold.HoldStatus.HELD) {
            throw new IllegalStateException("Hold is not in HELD status: " + hold.getStatus());
        }

        if (hold.getReservedUntil().before(new Date())) {
            hold.setStatus(Hold.HoldStatus.EXPIRED);
            holdRepository.save(hold);
            throw new IllegalStateException("Hold has expired");
        }

        // Get quote details
        Quote quote = quoteRepository.findById(hold.getQuoteId()).orElse(null);
        if (quote == null) {
            throw new IllegalStateException("Quote not found: " + hold.getQuoteId());
        }

        try {
            // Call Python backend to create booking
            Map<String, Object> holdData = new HashMap<String, Object>();
            holdData.put("travelerId", quote.getTravelerId());
            holdData.put("travelerName", quote.getTravelerName());
            holdData.put("flightId", quote.getFlightId());
            holdData.put("seatClass", quote.getSeatClass());

            PythonBackendClient.BookingResponse booking = pythonBackendClient.createBookingFromHold(holdData);

            // Update hold with booking reference
            hold.setStatus(Hold.HoldStatus.CONFIRMED);
            hold.setExternalBookingReference(String.valueOf(booking.getBookingId()));
            Hold confirmedHold = holdRepository.save(hold);

            // Audit event
            createAuditEvent("HOLD", holdId, "CONFIRMED",
                    "Hold confirmed, booking ID: " + booking.getBookingId());

            log.info("Hold " + holdId + " confirmed successfully with booking " + booking.getBookingId());
            return confirmedHold;

        } catch (PythonBackendClient.BookingCreationException e) {
            log.error("Failed to create booking for hold " + holdId, e);
            hold.setStatus(Hold.HoldStatus.CONFIRMATION_FAILED);
            hold.setErrorMessage(e.getMessage());
            holdRepository.save(hold);

            createAuditEvent("HOLD", holdId, "CONFIRMATION_FAILED", e.getMessage());

            throw new IllegalStateException("Failed to confirm hold: " + e.getMessage(), e);
        }
    }

    @Transactional
    public Hold releaseHold(String holdId) {
        log.info("Releasing hold " + holdId);

        Hold hold = holdRepository.findById(holdId).orElse(null);
        if (hold == null) {
            throw new IllegalArgumentException("Hold not found: " + holdId);
        }

        if (hold.getStatus() != Hold.HoldStatus.HELD) {
            throw new IllegalStateException("Hold cannot be released, current status: " + hold.getStatus());
        }

        hold.setStatus(Hold.HoldStatus.RELEASED);
        hold = holdRepository.save(hold);

        createAuditEvent("HOLD", holdId, "RELEASED", "Hold manually released");

        log.info("Hold " + holdId + " released successfully");
        return hold;
    }

    private String generateHoldId() {
        Calendar cal = Calendar.getInstance();
        int year = cal.get(Calendar.YEAR);
        long count = holdRepository.count() + 1;
        return String.format("H-%d-%06d", year, count);
    }

    private void createAuditEvent(String entityType, String entityId, String eventType, String details) {
        AuditEvent event = new AuditEvent();
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setEventType(eventType);
        event.setDetails(details);
        auditEventRepository.save(event);
    }
}

// Made with Bob
