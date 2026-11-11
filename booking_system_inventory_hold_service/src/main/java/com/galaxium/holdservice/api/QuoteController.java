package com.galaxium.holdservice.api;

import com.galaxium.holdservice.api.dto.CreateQuoteRequest;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.service.QuoteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/v1/quotes")
public class QuoteController {

    private static final Logger log = LoggerFactory.getLogger(QuoteController.class);

    private final QuoteService quoteService;

    public QuoteController(QuoteService quoteService) {
        this.quoteService = quoteService;
    }

    @PostMapping
    public ResponseEntity<Quote> createQuote(@Valid @RequestBody CreateQuoteRequest request) {
        log.info("POST /api/v1/quotes - Creating quote for flight {}", request.getFlightId());
        Quote quote = quoteService.createQuote(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(quote);
    }

    @GetMapping("/{quoteId}")
    public ResponseEntity<Quote> getQuote(@PathVariable String quoteId) {
        log.info("GET /api/v1/quotes/{} - Retrieving quote", quoteId);
        return quoteService.getQuote(quoteId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}

// Made with Bob
