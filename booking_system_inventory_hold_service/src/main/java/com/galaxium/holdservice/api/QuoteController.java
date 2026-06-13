package com.galaxium.holdservice.api;

import com.galaxium.holdservice.api.dto.CreateQuoteRequest;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.service.QuoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/quotes")
@RequiredArgsConstructor
@Slf4j
public class QuoteController {

    private final QuoteService quoteService;

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
