package com.galaxium.holdservice.api;

import com.galaxium.holdservice.api.dto.CreateQuoteRequest;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.service.QuoteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/v1/quotes")
public class QuoteController {

    private static final Logger log = LoggerFactory.getLogger(QuoteController.class);

    @Autowired
    private QuoteService quoteService;

    @PostMapping
    public ResponseEntity<Quote> createQuote(@Valid @RequestBody CreateQuoteRequest request) {
        log.info("POST /api/v1/quotes - Creating quote for flight " + request.getFlightId());
        Quote quote = quoteService.createQuote(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(quote);
    }

    @GetMapping("/{quoteId}")
    public ResponseEntity<Quote> getQuote(@PathVariable("quoteId") String quoteId) {
        log.info("GET /api/v1/quotes/" + quoteId + " - Retrieving quote");
        Quote quote = quoteService.getQuote(quoteId);
        if (quote == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(quote);
    }
}

// Made with Bob
