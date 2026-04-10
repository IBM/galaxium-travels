package com.galaxium.holdservice.service;

import com.galaxium.holdservice.client.PythonBackendClient;
import com.galaxium.holdservice.domain.AuditEvent;
import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.HoldRepository;
import com.galaxium.holdservice.repository.QuoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class HoldService {

    private final HoldRepository holdRepository;
    private final QuoteRepository quoteRepository;
    private final AuditEventRepository auditEventRepository;
    private final PythonBackendClient pythonBackendClient;

    @Value("${hold.duration.minutes:15}")
    private int holdDurationMinutes;

    @Transactional
    public Hold createHold(String quoteId) {
        log.info("Creating hold for quote {}", quoteId);

        // Verify quote exists
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new IllegalArgumentException("Quote not found: " + quoteId));

        // Check if quote is expired
        if (quote.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("Quote has expired");
        }

        // Generate hold ID
        String holdId = generateHoldId();

        // Create hold
        Hold hold = Hold.builder()
                .holdId(holdId)
                .quoteId(quoteId)
                .status(Hold.HoldStatus.HELD)
                .reservedUntil(Instant.now().plus(holdDurationMinutes, ChronoUnit.MINUTES))
                .build();

        hold = holdRepository.save(hold);

        // Audit event
        createAuditEvent("HOLD", holdId, "CREATED",
                String.format("Hold created for quote %s, expires at %s", quoteId, hold.getReservedUntil()));

        log.info("Hold {} created successfully", holdId);
        return hold;
    }

    @Transactional(readOnly = true)
    public Optional<Hold> getHold(String holdId) {
        return holdRepository.findById(holdId);
    }

    @Transactional
    public Hold confirmHold(String holdId) {
        log.info("Confirming hold {}", holdId);

        Hold hold = holdRepository.findById(holdId)
                .orElseThrow(() -> new IllegalArgumentException("Hold not found: " + holdId));

        // Check if already confirmed
        if (hold.getStatus() == Hold.HoldStatus.CONFIRMED) {
            log.info("Hold {} already confirmed, returning existing booking reference", holdId);
            return hold;
        }

        // Check if hold is still valid
        if (hold.getStatus() != Hold.HoldStatus.HELD) {
            throw new IllegalStateException("Hold is not in HELD status: " + hold.getStatus());
        }

        if (hold.getReservedUntil().isBefore(Instant.now())) {
            hold.setStatus(Hold.HoldStatus.EXPIRED);
            holdRepository.save(hold);
            throw new IllegalStateException("Hold has expired");
        }

        // Get quote details
        Quote quote = quoteRepository.findById(hold.getQuoteId())
                .orElseThrow(() -> new IllegalStateException("Quote not found: " + hold.getQuoteId()));

        try {
            // Call Python backend to create booking
            Map<String, Object> holdData = Map.of(
                    "travelerId", quote.getTravelerId(),
                    "travelerName", quote.getTravelerName(),
                    "flightId", quote.getFlightId(),
                    "seatClass", quote.getSeatClass()
            );

            PythonBackendClient.BookingResponse booking = pythonBackendClient.createBookingFromHold(holdData);

            // Update hold with booking reference
            hold.setStatus(Hold.HoldStatus.CONFIRMED);
            hold.setExternalBookingReference(String.valueOf(booking.getBookingId()));
            Hold confirmedHold = holdRepository.save(hold);

            // Audit event
            createAuditEvent("HOLD", holdId, "CONFIRMED",
                    String.format("Hold confirmed, booking ID: %s", booking.getBookingId()));

            log.info("Hold {} confirmed successfully with booking {}", holdId, booking.getBookingId());
            return confirmedHold;

        } catch (PythonBackendClient.BookingCreationException e) {
            log.error("Failed to create booking for hold {}", holdId, e);
            hold.setStatus(Hold.HoldStatus.CONFIRMATION_FAILED);
            hold.setErrorMessage(e.getMessage());
            Hold failedHold = holdRepository.save(hold);

            createAuditEvent("HOLD", holdId, "CONFIRMATION_FAILED", e.getMessage());

            throw new IllegalStateException("Failed to confirm hold: " + e.getMessage(), e);
        }
    }

    @Transactional
    public Hold releaseHold(String holdId) {
        log.info("Releasing hold {}", holdId);

        Hold hold = holdRepository.findById(holdId)
                .orElseThrow(() -> new IllegalArgumentException("Hold not found: " + holdId));

        if (hold.getStatus() != Hold.HoldStatus.HELD) {
            throw new IllegalStateException("Hold cannot be released, current status: " + hold.getStatus());
        }

        hold.setStatus(Hold.HoldStatus.RELEASED);
        hold = holdRepository.save(hold);

        createAuditEvent("HOLD", holdId, "RELEASED", "Hold manually released");

        log.info("Hold {} released successfully", holdId);
        return hold;
    }

    private String generateHoldId() {
        int year = Year.now().getValue();
        long count = holdRepository.count() + 1;
        return String.format("H-%d-%06d", year, count);
    }

    private void createAuditEvent(String entityType, String entityId, String eventType, String details) {
        AuditEvent event = AuditEvent.builder()
                .entityType(entityType)
                .entityId(entityId)
                .eventType(eventType)
                .details(details)
                .build();
        auditEventRepository.save(event);
    }
}

// Made with Bob
