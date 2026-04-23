package com.galaxium.holdservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class PricingService {

    public long calculatePrice(int basePrice, String seatClass) {
        double multiplier = switch (seatClass.toLowerCase()) {
            case "economy" -> 1.0;
            case "business" -> 2.5;
            case "galaxium" -> 5.0;
            default -> 1.0;
        };

        long finalPrice = (long) (basePrice * multiplier);

        log.debug("Calculated price from base price {} in {}: {}", basePrice, seatClass, finalPrice);
        return finalPrice;
    }
}

// Made with Bob
