package com.galaxium.holdservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PricingServiceTest {

    private PricingService pricingService;

    @BeforeEach
    void setUp() {
        pricingService = new PricingService();
    }

    // --- economy base price ---

    @Test
    void shouldReturnEconomyBasePrice_whenFlightIdModThreeIsZero() {
        // flightId 3 → multiplier = 1.0 + (3 % 3) * 0.1 = 1.0
        long price = pricingService.calculatePrice(3, "economy");
        assertThat(price).isEqualTo((long) (500_000L * 1.0));
    }

    @Test
    void shouldApplyMultiplier1_1_whenFlightIdModThreeIsOne() {
        // flightId 1 → multiplier = 1.0 + (1 % 3) * 0.1 = 1.1
        long price = pricingService.calculatePrice(1, "economy");
        assertThat(price).isEqualTo((long) (500_000L * 1.1));
    }

    @Test
    void shouldApplyMultiplier1_2_whenFlightIdModThreeIsTwo() {
        // flightId 2 → multiplier = 1.0 + (2 % 3) * 0.1 = 1.2
        long price = pricingService.calculatePrice(2, "economy");
        assertThat(price).isEqualTo((long) (500_000L * 1.2));
    }

    // --- business base price ---

    @Test
    void shouldReturnBusinessBasePrice_whenSeatClassIsBusiness() {
        // flightId 3 → multiplier 1.0
        long price = pricingService.calculatePrice(3, "business");
        assertThat(price).isEqualTo((long) (2_500_000L * 1.0));
    }

    @Test
    void shouldApplyMultiplierToBusinessPrice() {
        // flightId 1 → multiplier 1.1
        long price = pricingService.calculatePrice(1, "business");
        assertThat(price).isEqualTo((long) (2_500_000L * 1.1));
    }

    // --- first class base price ---

    @Test
    void shouldReturnFirstClassBasePrice_whenSeatClassIsFirst() {
        // flightId 3 → multiplier 1.0
        long price = pricingService.calculatePrice(3, "first");
        assertThat(price).isEqualTo((long) (5_000_000L * 1.0));
    }

    @Test
    void shouldApplyMultiplierToFirstClassPrice() {
        // flightId 2 → multiplier 1.2
        long price = pricingService.calculatePrice(2, "first");
        assertThat(price).isEqualTo((long) (5_000_000L * 1.2));
    }

    // --- unknown seat class falls back to economy base ---

    @Test
    void shouldFallBackToEconomyBase_whenSeatClassIsUnknown() {
        long price = pricingService.calculatePrice(3, "galactic");
        assertThat(price).isEqualTo((long) (500_000L * 1.0));
    }

    // --- case sensitivity: uppercase key not in map, falls back ---

    @Test
    void shouldFallBackToEconomyBase_whenSeatClassIsUppercase() {
        // The map only contains lowercase keys; "ECONOMY" is not a hit
        long price = pricingService.calculatePrice(3, "ECONOMY");
        assertThat(price).isEqualTo((long) (500_000L * 1.0));
    }
}
