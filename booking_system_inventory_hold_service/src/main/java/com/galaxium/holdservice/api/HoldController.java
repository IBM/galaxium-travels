package com.galaxium.holdservice.api;

import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.service.HoldService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/v1")
public class HoldController {

    private static final Logger log = LoggerFactory.getLogger(HoldController.class);

    private final HoldService holdService;

    public HoldController(HoldService holdService) {
        this.holdService = holdService;
    }

    @PostMapping("/quotes/{quoteId}/holds")
    public ResponseEntity<Hold> createHold(@PathVariable String quoteId) {
        log.info("POST /api/v1/quotes/{}/holds - Creating hold", quoteId);
        try {
            Hold hold = holdService.createHold(quoteId);
            return ResponseEntity.status(HttpStatus.CREATED).body(hold);
        } catch (IllegalArgumentException e) {
            log.error("Invalid quote ID: {}", quoteId, e);
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.error("Cannot create hold: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/holds/{holdId}")
    public ResponseEntity<Hold> getHold(@PathVariable String holdId) {
        log.info("GET /api/v1/holds/{} - Retrieving hold", holdId);
        return holdService.getHold(holdId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/holds/{holdId}/confirm")
    public ResponseEntity<Hold> confirmHold(@PathVariable String holdId) {
        log.info("POST /api/v1/holds/{}/confirm - Confirming hold", holdId);
        try {
            Hold hold = holdService.confirmHold(holdId);
            return ResponseEntity.ok(hold);
        } catch (IllegalArgumentException e) {
            log.error("Hold not found: {}", holdId, e);
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.error("Cannot confirm hold: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/holds/{holdId}/release")
    public ResponseEntity<Hold> releaseHold(@PathVariable String holdId) {
        log.info("POST /api/v1/holds/{}/release - Releasing hold", holdId);
        try {
            Hold hold = holdService.releaseHold(holdId);
            return ResponseEntity.ok(hold);
        } catch (IllegalArgumentException e) {
            log.error("Hold not found: {}", holdId, e);
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.error("Cannot release hold: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}

// Made with Bob
