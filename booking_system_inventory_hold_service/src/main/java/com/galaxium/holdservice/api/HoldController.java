package com.galaxium.holdservice.api;

import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.service.HoldService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class HoldController {

    private static final Logger log = LoggerFactory.getLogger(HoldController.class);

    @Autowired
    private HoldService holdService;

    @PostMapping("/quotes/{quoteId}/holds")
    public ResponseEntity<Hold> createHold(@PathVariable("quoteId") String quoteId) {
        log.info("POST /api/v1/quotes/" + quoteId + "/holds - Creating hold");
        try {
            Hold hold = holdService.createHold(quoteId);
            return ResponseEntity.status(HttpStatus.CREATED).body(hold);
        } catch (IllegalArgumentException e) {
            log.error("Invalid quote ID: " + quoteId, e);
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.error("Cannot create hold: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/holds/{holdId}")
    public ResponseEntity<Hold> getHold(@PathVariable("holdId") String holdId) {
        log.info("GET /api/v1/holds/" + holdId + " - Retrieving hold");
        Hold hold = holdService.getHold(holdId);
        if (hold == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(hold);
    }

    @PostMapping("/holds/{holdId}/confirm")
    public ResponseEntity<Hold> confirmHold(@PathVariable("holdId") String holdId) {
        log.info("POST /api/v1/holds/" + holdId + "/confirm - Confirming hold");
        try {
            Hold hold = holdService.confirmHold(holdId);
            return ResponseEntity.ok(hold);
        } catch (IllegalArgumentException e) {
            log.error("Hold not found: " + holdId, e);
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.error("Cannot confirm hold: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/holds/{holdId}/release")
    public ResponseEntity<Hold> releaseHold(@PathVariable("holdId") String holdId) {
        log.info("POST /api/v1/holds/" + holdId + "/release - Releasing hold");
        try {
            Hold hold = holdService.releaseHold(holdId);
            return ResponseEntity.ok(hold);
        } catch (IllegalArgumentException e) {
            log.error("Hold not found: " + holdId, e);
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.error("Cannot release hold: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}

// Made with Bob
