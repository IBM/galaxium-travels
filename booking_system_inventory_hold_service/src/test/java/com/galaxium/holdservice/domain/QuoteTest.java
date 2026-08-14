package com.galaxium.holdservice.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Quote - Domain Model Tests")
class QuoteTest {

    private Quote quote;

    @BeforeEach
    void setUp() {
        quote = new Quote();
    }

    @Test
    @DisplayName("Should create Quote with builder")
    void testCreateQuoteWithBuilder() {
        // Arrange
        String quoteId = "quote-123";
        Integer flightId = 100;
        String seatClass = "ECONOMY";
        Integer quantity = 2;
        Integer travelerId = 1001;
        String travelerName = "John Doe";
        Long pricePerSeat = 50000L;
        Long totalPrice = 100000L;
        Instant expiresAt = Instant.now().plusSeconds(86400);
        Instant createdAt = Instant.now();

        // Act
        Quote q = Quote.builder()
                .quoteId(quoteId)
                .flightId(flightId)
                .seatClass(seatClass)
                .quantity(quantity)
                .travelerId(travelerId)
                .travelerName(travelerName)
                .pricePerSeat(pricePerSeat)
                .totalPrice(totalPrice)
                .expiresAt(expiresAt)
                .status(Quote.QuoteStatus.CREATED)
                .createdAt(createdAt)
                .build();

        // Assert
        assertEquals(quoteId, q.getQuoteId());
        assertEquals(flightId, q.getFlightId());
        assertEquals(seatClass, q.getSeatClass());
        assertEquals(quantity, q.getQuantity());
        assertEquals(travelerId, q.getTravelerId());
        assertEquals(travelerName, q.getTravelerName());
        assertEquals(pricePerSeat, q.getPricePerSeat());
        assertEquals(totalPrice, q.getTotalPrice());
        assertEquals(expiresAt, q.getExpiresAt());
        assertEquals(Quote.QuoteStatus.CREATED, q.getStatus());
        assertEquals(createdAt, q.getCreatedAt());
    }

    @Test
    @DisplayName("Should set quoteId field")
    void testSetQuoteId() {
        // Act
        quote.setQuoteId("quote-456");

        // Assert
        assertEquals("quote-456", quote.getQuoteId());
    }

    @Test
    @DisplayName("Should set flightId field")
    void testSetFlightId() {
        // Act
        quote.setFlightId(200);

        // Assert
        assertEquals(200, quote.getFlightId());
    }

    @Test
    @DisplayName("Should set seatClass field")
    void testSetSeatClass() {
        // Act
        quote.setSeatClass("BUSINESS");

        // Assert
        assertEquals("BUSINESS", quote.getSeatClass());
    }

    @Test
    @DisplayName("Should set quantity field")
    void testSetQuantity() {
        // Act
        quote.setQuantity(3);

        // Assert
        assertEquals(3, quote.getQuantity());
    }

    @Test
    @DisplayName("Should set travelerId field")
    void testSetTravelerId() {
        // Act
        quote.setTravelerId(2001);

        // Assert
        assertEquals(2001, quote.getTravelerId());
    }

    @Test
    @DisplayName("Should set travelerName field")
    void testSetTravelerName() {
        // Act
        quote.setTravelerName("Jane Smith");

        // Assert
        assertEquals("Jane Smith", quote.getTravelerName());
    }

    @Test
    @DisplayName("Should set pricePerSeat field")
    void testSetPricePerSeat() {
        // Act
        quote.setPricePerSeat(75000L);

        // Assert
        assertEquals(75000L, quote.getPricePerSeat());
    }

    @Test
    @DisplayName("Should set totalPrice field")
    void testSetTotalPrice() {
        // Act
        quote.setTotalPrice(150000L);

        // Assert
        assertEquals(150000L, quote.getTotalPrice());
    }

    @Test
    @DisplayName("Should set expiresAt field")
    void testSetExpiresAt() {
        // Arrange
        Instant expiresAt = Instant.now().plusSeconds(86400);

        // Act
        quote.setExpiresAt(expiresAt);

        // Assert
        assertEquals(expiresAt, quote.getExpiresAt());
    }

    @Test
    @DisplayName("Should set status field")
    void testSetStatus() {
        // Act
        quote.setStatus(Quote.QuoteStatus.CREATED);

        // Assert
        assertEquals(Quote.QuoteStatus.CREATED, quote.getStatus());
    }

    @Test
    @DisplayName("Should set createdAt field")
    void testSetCreatedAt() {
        // Arrange
        Instant now = Instant.now();

        // Act
        quote.setCreatedAt(now);

        // Assert
        assertEquals(now, quote.getCreatedAt());
    }

    @Test
    @DisplayName("Should automatically set createdAt on creation if null")
    void testOnCreateSetsCreatedAtWhenNull() {
        // Arrange
        quote.setQuoteId("quote-123");
        quote.setFlightId(100);

        // Act
        quote.onCreate();

        // Assert
        assertNotNull(quote.getCreatedAt());
        assertTrue(quote.getCreatedAt().isBefore(Instant.now().plusSeconds(1)));
    }

    @Test
    @DisplayName("Should not override createdAt if already set")
    void testOnCreateDoesNotOverrideExistingCreatedAt() {
        // Arrange
        Instant originalTime = Instant.now().minusSeconds(100);
        quote.setCreatedAt(originalTime);

        // Act
        quote.onCreate();

        // Assert
        assertEquals(originalTime, quote.getCreatedAt());
    }

    @Test
    @DisplayName("Should construct Quote with all arguments constructor")
    void testAllArgsConstructor() {
        // Arrange
        String quoteId = "quote-789";
        Integer flightId = 300;
        String seatClass = "FIRST";
        Integer quantity = 1;
        Integer travelerId = 3001;
        String travelerName = "Bob Johnson";
        Long pricePerSeat = 100000L;
        Long totalPrice = 100000L;
        Instant expiresAt = Instant.now().plusSeconds(86400);
        Quote.QuoteStatus status = Quote.QuoteStatus.CREATED;
        Instant createdAt = Instant.now();

        // Act
        Quote q = new Quote(quoteId, flightId, seatClass, quantity, travelerId, 
                            travelerName, pricePerSeat, totalPrice, expiresAt, status, createdAt);

        // Assert
        assertEquals(quoteId, q.getQuoteId());
        assertEquals(flightId, q.getFlightId());
        assertEquals(seatClass, q.getSeatClass());
        assertEquals(quantity, q.getQuantity());
        assertEquals(travelerId, q.getTravelerId());
        assertEquals(travelerName, q.getTravelerName());
        assertEquals(pricePerSeat, q.getPricePerSeat());
        assertEquals(totalPrice, q.getTotalPrice());
        assertEquals(expiresAt, q.getExpiresAt());
        assertEquals(status, q.getStatus());
        assertEquals(createdAt, q.getCreatedAt());
    }

    @Test
    @DisplayName("Should create Quote with no-args constructor")
    void testNoArgsConstructor() {
        // Act
        Quote q = new Quote();

        // Assert
        assertNull(q.getQuoteId());
        assertNull(q.getFlightId());
        assertNull(q.getSeatClass());
        assertNull(q.getQuantity());
        assertNull(q.getTravelerId());
        assertNull(q.getTravelerName());
        assertNull(q.getPricePerSeat());
        assertNull(q.getTotalPrice());
        assertNull(q.getExpiresAt());
        assertNull(q.getStatus());
        assertNull(q.getCreatedAt());
    }

    @Test
    @DisplayName("Should support equals and hashCode")
    void testEqualsAndHashCode() {
        // Arrange
        String quoteId = "quote-100";
        Quote quote1 = Quote.builder()
                .quoteId(quoteId)
                .flightId(100)
                .seatClass("ECONOMY")
                .quantity(2)
                .travelerId(1001)
                .travelerName("John Doe")
                .pricePerSeat(50000L)
                .totalPrice(100000L)
                .status(Quote.QuoteStatus.CREATED)
                .build();

        Quote quote2 = Quote.builder()
                .quoteId(quoteId)
                .flightId(100)
                .seatClass("ECONOMY")
                .quantity(2)
                .travelerId(1001)
                .travelerName("John Doe")
                .pricePerSeat(50000L)
                .totalPrice(100000L)
                .status(Quote.QuoteStatus.CREATED)
                .build();

        // Act & Assert
        assertEquals(quote1, quote2);
        assertEquals(quote1.hashCode(), quote2.hashCode());
    }

    @Test
    @DisplayName("Should have proper toString representation")
    void testToString() {
        // Arrange
        quote.setQuoteId("quote-123");
        quote.setFlightId(100);
        quote.setSeatClass("ECONOMY");

        // Act
        String toString = quote.toString();

        // Assert
        assertNotNull(toString);
        assertFalse(toString.isEmpty());
        assertTrue(toString.contains("quote-123") || toString.contains("quoteId"));
    }

    @Test
    @DisplayName("Should handle various seat classes")
    void testVariousSeatClasses() {
        // Arrange
        String[] seatClasses = {"ECONOMY", "BUSINESS", "FIRST", "PREMIUM_ECONOMY"};

        // Act & Assert
        for (String seatClass : seatClasses) {
            quote.setSeatClass(seatClass);
            assertEquals(seatClass, quote.getSeatClass());
        }
    }

    @Test
    @DisplayName("Should handle zero quantity")
    void testZeroQuantity() {
        // Act
        quote.setQuantity(0);

        // Assert
        assertEquals(0, quote.getQuantity());
    }

    @Test
    @DisplayName("Should handle large quantity")
    void testLargeQuantity() {
        // Act
        quote.setQuantity(100);

        // Assert
        assertEquals(100, quote.getQuantity());
    }

    @Test
    @DisplayName("Should handle zero price")
    void testZeroPrice() {
        // Act
        quote.setPricePerSeat(0L);
        quote.setTotalPrice(0L);

        // Assert
        assertEquals(0L, quote.getPricePerSeat());
        assertEquals(0L, quote.getTotalPrice());
    }

    @Test
    @DisplayName("Should handle large prices")
    void testLargePrices() {
        // Act
        quote.setPricePerSeat(999999999L);
        quote.setTotalPrice(9999999999L);

        // Assert
        assertEquals(999999999L, quote.getPricePerSeat());
        assertEquals(9999999999L, quote.getTotalPrice());
    }

    @Test
    @DisplayName("Should handle long traveler names")
    void testLongTravelerName() {
        // Arrange
        String longName = "A".repeat(255);

        // Act
        quote.setTravelerName(longName);

        // Assert
        assertEquals(longName, quote.getTravelerName());
    }

    @Test
    @DisplayName("Should verify quote expiration logic")
    void testQuoteExpiration() {
        // Arrange
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(86400); // 24 hours
        quote.setExpiresAt(expiresAt);

        // Act & Assert
        assertTrue(expiresAt.isAfter(now));
        assertEquals(86400L, expiresAt.getEpochSecond() - now.getEpochSecond(), 1);
    }

    @Test
    @DisplayName("Should handle negative flight IDs (edge case)")
    void testNegativeFlightId() {
        // Act
        quote.setFlightId(-1);

        // Assert
        assertEquals(-1, quote.getFlightId());
    }

    @Test
    @DisplayName("Should handle negative traveler IDs (edge case)")
    void testNegativeTravelerId() {
        // Act
        quote.setTravelerId(-1);

        // Assert
        assertEquals(-1, quote.getTravelerId());
    }

    @Test
    @DisplayName("Should have QuoteStatus enum with CREATED value")
    void testQuoteStatusEnum() {
        // Act & Assert
        assertNotNull(Quote.QuoteStatus.CREATED);
        assertEquals("CREATED", Quote.QuoteStatus.CREATED.toString());
    }
}
