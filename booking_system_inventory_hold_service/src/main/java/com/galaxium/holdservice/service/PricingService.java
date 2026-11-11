package com.galaxium.holdservice.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class PricingService {

    private static final Logger log = LoggerFactory.getLogger(PricingService.class);

    // Simplified pricing logic - in real system would call Python backend or pricing API
    private static final Map<String, Long> BASE_PRICES = Map.of(
            "economy", 500000L,      // 5000 credits
            "business", 2500000L,    // 25000 credits
            "first", 5000000L        // 50000 credits
    );

    public long calculatePrice(Integer flightId, String seatClass) {
        Long basePrice = BASE_PRICES.getOrDefault(seatClass.toLowerCase(), 500000L);
        
        // Add flight-specific multiplier (simplified)
        double multiplier = 1.0 + (flightId % 3) * 0.1;
        
        long finalPrice = (long) (basePrice * multiplier);
        
        log.debug("Calculated price for flight {} in {}: {}", flightId, seatClass, finalPrice);
        return finalPrice;
    }
}

// Made with Bob
