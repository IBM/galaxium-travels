package com.galaxium.holdservice.api;

import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.service.HoldService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class HoldController {

    private final HoldService holdService;

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
    public ResponseEntity<?> confirmHold(
            @PathVariable String holdId,
            @RequestBody(required = false) Map<String, Object> requestBody
    ) {
        log.info("POST /api/v1/holds/{}/confirm - Confirming hold", holdId);
        try {
            List<Map<String, Object>> addons = null;
            if (requestBody != null && requestBody.containsKey("addons")) {
                Object rawAddons = requestBody.get("addons");
                
                // Validate that addons is a list
                if (!(rawAddons instanceof List<?>)) {
                    log.error("Invalid addons type: expected List but got {}",
                            rawAddons != null ? rawAddons.getClass().getSimpleName() : "null");
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Invalid request: 'addons' must be a list"));
                }
                
                List<?> addonList = (List<?>) rawAddons;
                
                // Validate that all elements are maps
                for (int i = 0; i < addonList.size(); i++) {
                    Object item = addonList.get(i);
                    if (!(item instanceof Map)) {
                        log.error("Invalid addon element at index {}: expected Map but got {}",
                                i, item != null ? item.getClass().getSimpleName() : "null");
                        return ResponseEntity.badRequest()
                                .body(Map.of("error", "Invalid request: all elements in 'addons' must be objects"));
                    }
                }
                
                addons = addonList.stream()
                        .map(addon -> (Map<String, Object>) addon)
                        .toList();
            }

            Hold hold = holdService.confirmHold(holdId, addons);
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
