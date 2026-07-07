package com.galaxium.holdservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class PricingService {

    private static final Logger log = LoggerFactory.getLogger(PricingService.class);

    // Simplified pricing logic - in real system would call Python backend or pricing API
    private static final Map<String, Long> BASE_PRICES = new HashMap<String, Long>();

    static {
        BASE_PRICES.put("economy", 500000L);      // 5000 credits
        BASE_PRICES.put("business", 2500000L);    // 25000 credits
        BASE_PRICES.put("first", 5000000L);       // 50000 credits
    }

    public long calculatePrice(Integer flightId, String seatClass) {
        Long basePrice = BASE_PRICES.get(seatClass.toLowerCase());
        if (basePrice == null) {
            basePrice = Long.valueOf(500000L);
        }

        // Add flight-specific multiplier (simplified)
        double multiplier = 1.0 + (flightId % 3) * 0.1;

        long finalPrice = (long) (basePrice * multiplier);

        log.debug("Calculated price for flight " + flightId + " in " + seatClass + ": " + finalPrice);
        return finalPrice;
    }
}

// Made with Bob
