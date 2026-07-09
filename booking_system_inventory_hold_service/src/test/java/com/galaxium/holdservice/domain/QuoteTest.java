package com.galaxium.holdservice.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

class QuoteTest {

    private Quote quote;

    @BeforeEach
    void setUp() {
        quote = new Quote();
    }

    // --- getters / setters ---

    @Test
    void shouldStoreAndReturnQuoteId() {
        quote.setQuoteId("Q-2024-000001");
        assertThat(quote.getQuoteId()).isEqualTo("Q-2024-000001");
    }

    @Test
    void shouldStoreAndReturnFlightId() {
        quote.setFlightId(42);
        assertThat(quote.getFlightId()).isEqualTo(42);
    }

    @Test
    void shouldStoreAndReturnSeatClass() {
        quote.setSeatClass("business");
        assertThat(quote.getSeatClass()).isEqualTo("business");
    }

    @Test
    void shouldStoreAndReturnQuantity() {
        quote.setQuantity(3);
        assertThat(quote.getQuantity()).isEqualTo(3);
    }

    @Test
    void shouldStoreAndReturnTravelerId() {
        quote.setTravelerId(101);
        assertThat(quote.getTravelerId()).isEqualTo(101);
    }

    @Test
    void shouldStoreAndReturnTravelerName() {
        quote.setTravelerName("Jane Smith");
        assertThat(quote.getTravelerName()).isEqualTo("Jane Smith");
    }

    @Test
    void shouldStoreAndReturnPricePerSeat() {
        quote.setPricePerSeat(500_000L);
        assertThat(quote.getPricePerSeat()).isEqualTo(500_000L);
    }

    @Test
    void shouldStoreAndReturnTotalPrice() {
        quote.setTotalPrice(1_500_000L);
        assertThat(quote.getTotalPrice()).isEqualTo(1_500_000L);
    }

    @Test
    void shouldStoreAndReturnExpiresAt() {
        Date expiresAt = new Date(System.currentTimeMillis() + 86_400_000L);
        quote.setExpiresAt(expiresAt);
        assertThat(quote.getExpiresAt()).isEqualTo(expiresAt);
    }

    @Test
    void shouldStoreAndReturnStatus() {
        quote.setStatus(Quote.QuoteStatus.CREATED);
        assertThat(quote.getStatus()).isEqualTo(Quote.QuoteStatus.CREATED);
    }

    @Test
    void shouldStoreAndReturnCreatedAt() {
        Date now = new Date();
        quote.setCreatedAt(now);
        assertThat(quote.getCreatedAt()).isEqualTo(now);
    }

    // --- QuoteStatus enum ---

    @Test
    void quoteStatusEnum_shouldContainCreatedValue() {
        Quote.QuoteStatus[] values = Quote.QuoteStatus.values();
        assertThat(values).containsExactly(Quote.QuoteStatus.CREATED);
    }

    @Test
    void quoteStatusEnum_shouldResolveByName() {
        assertThat(Quote.QuoteStatus.valueOf("CREATED")).isEqualTo(Quote.QuoteStatus.CREATED);
    }

    // --- @PrePersist onCreate() ---

    @Test
    void onCreate_shouldSetCreatedAt_whenCreatedAtIsNull() {
        Date before = new Date();
        quote.onCreate();
        Date after = new Date();

        assertThat(quote.getCreatedAt())
                .isNotNull()
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
    }

    @Test
    void onCreate_shouldNotOverwriteCreatedAt_whenAlreadySet() {
        Date original = new Date(0L);
        quote.setCreatedAt(original);

        quote.onCreate();

        assertThat(quote.getCreatedAt()).isEqualTo(original);
    }

    @Test
    void onCreate_shouldLeaveOtherFieldsUnchanged() {
        quote.setQuoteId("Q-2024-999999");
        quote.setStatus(Quote.QuoteStatus.CREATED);

        quote.onCreate();

        assertThat(quote.getQuoteId()).isEqualTo("Q-2024-999999");
        assertThat(quote.getStatus()).isEqualTo(Quote.QuoteStatus.CREATED);
    }

    // --- default state after construction ---

    @Test
    void shouldHaveAllNullFieldsByDefault() {
        Quote fresh = new Quote();

        assertThat(fresh.getQuoteId()).isNull();
        assertThat(fresh.getFlightId()).isNull();
        assertThat(fresh.getSeatClass()).isNull();
        assertThat(fresh.getQuantity()).isNull();
        assertThat(fresh.getTravelerId()).isNull();
        assertThat(fresh.getTravelerName()).isNull();
        assertThat(fresh.getPricePerSeat()).isNull();
        assertThat(fresh.getTotalPrice()).isNull();
        assertThat(fresh.getExpiresAt()).isNull();
        assertThat(fresh.getStatus()).isNull();
        assertThat(fresh.getCreatedAt()).isNull();
    }
}
