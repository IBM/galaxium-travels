package com.galaxium.holdservice.service;

import com.galaxium.holdservice.api.dto.CreateQuoteRequest;
import com.galaxium.holdservice.domain.AuditEvent;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.QuoteRepository;
import org.apache.commons.text.StringSubstitutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;

@Service
public class QuoteService {

    private static final Logger log = LoggerFactory.getLogger(QuoteService.class);

    @Autowired
    private QuoteRepository quoteRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private PricingService pricingService;

    @Transactional
    public Quote createQuote(CreateQuoteRequest request) {
        log.info("Creating quote for flight " + request.getFlightId() + " with "
                + request.getQuantity() + " " + request.getSeatClass() + " seats");

        // Generate quote ID
        String quoteId = generateQuoteId();

        // Calculate pricing
        long pricePerSeat = pricingService.calculatePrice(
                request.getFlightId(),
                request.getSeatClass()
        );
        long totalPrice = pricePerSeat * request.getQuantity();

        // Quotes are valid for 24 hours
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.HOUR_OF_DAY, 24);

        // Create quote
        Quote quote = new Quote();
        quote.setQuoteId(quoteId);
        quote.setFlightId(request.getFlightId());
        quote.setSeatClass(request.getSeatClass());
        quote.setQuantity(request.getQuantity());
        quote.setTravelerId(request.getTravelerId());
        quote.setTravelerName(request.getTravelerName());
        quote.setPricePerSeat(pricePerSeat);
        quote.setTotalPrice(totalPrice);
        quote.setExpiresAt(cal.getTime());
        quote.setStatus(Quote.QuoteStatus.CREATED);

        quote = quoteRepository.save(quote);

        // Audit event
        Map<String, String> values = new HashMap<String, String>();
        values.put("flightId", String.valueOf(request.getFlightId()));
        values.put("quantity", String.valueOf(request.getQuantity()));
        values.put("seatClass", request.getSeatClass());
        createAuditEvent("QUOTE", quoteId, "CREATED",
                StringSubstitutor.replace("Quote created for flight ${flightId}, ${quantity} ${seatClass} seats", values));

        log.info("Quote " + quoteId + " created successfully");
        return quote;
    }

    @Transactional(readOnly = true)
    public Quote getQuote(String quoteId) {
        return quoteRepository.findById(quoteId).orElse(null);
    }

    private String generateQuoteId() {
        Calendar cal = Calendar.getInstance();
        int year = cal.get(Calendar.YEAR);
        long count = quoteRepository.count() + 1;
        return String.format("Q-%d-%06d", year, count);
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
