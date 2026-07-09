package com.galaxium.holdservice.repository;

import com.galaxium.holdservice.domain.Quote;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class QuoteRepositoryTest {

    @Autowired
    private QuoteRepository quoteRepository;

    private Quote quote;

    @BeforeEach
    void setUp() {
        quoteRepository.deleteAll();
        quote = buildQuote("Q-2025-000001", 42, "economy", 2);
    }

    // --- save and findById ---

    @Test
    void shouldPersistAndFindQuoteById() {
        quoteRepository.save(quote);

        Optional<Quote> found = quoteRepository.findById("Q-2025-000001");

        assertThat(found).isPresent();
        assertThat(found.get().getQuoteId()).isEqualTo("Q-2025-000001");
    }

    @Test
    void shouldReturnEmptyOptional_whenQuoteDoesNotExist() {
        Optional<Quote> found = quoteRepository.findById("Q-9999-999999");

        assertThat(found).isEmpty();
    }

    @Test
    void shouldPersistAllFields() {
        Date expiresAt = new Date(System.currentTimeMillis() + 86_400_000L);
        quote.setExpiresAt(expiresAt);

        quoteRepository.save(quote);
        Quote found = quoteRepository.findById("Q-2025-000001").get();

        assertThat(found.getFlightId()).isEqualTo(42);
        assertThat(found.getSeatClass()).isEqualTo("economy");
        assertThat(found.getQuantity()).isEqualTo(2);
        assertThat(found.getTravelerId()).isEqualTo(7);
        assertThat(found.getTravelerName()).isEqualTo("Alice");
        assertThat(found.getPricePerSeat()).isEqualTo(500_000L);
        assertThat(found.getTotalPrice()).isEqualTo(1_000_000L);
        assertThat(found.getStatus()).isEqualTo(Quote.QuoteStatus.CREATED);
        assertThat(found.getExpiresAt()).isEqualTo(expiresAt);
    }

    // --- findAll ---

    @Test
    void shouldReturnAllPersistedQuotes() {
        Quote q2 = buildQuote("Q-2025-000002", 10, "business", 1);

        quoteRepository.save(quote);
        quoteRepository.save(q2);

        List<Quote> all = quoteRepository.findAll();

        assertThat(all).hasSize(2)
                .extracting(Quote::getQuoteId)
                .containsExactlyInAnyOrder("Q-2025-000001", "Q-2025-000002");
    }

    @Test
    void shouldReturnEmptyList_whenNoQuotesPersisted() {
        List<Quote> all = quoteRepository.findAll();

        assertThat(all).isEmpty();
    }

    // --- delete ---

    @Test
    void shouldDeleteQuoteById() {
        quoteRepository.save(quote);

        quoteRepository.deleteById("Q-2025-000001");

        assertThat(quoteRepository.findById("Q-2025-000001")).isEmpty();
    }

    // --- count ---

    @Test
    void shouldReturnCorrectCount() {
        assertThat(quoteRepository.count()).isEqualTo(0);

        quoteRepository.save(quote);

        assertThat(quoteRepository.count()).isEqualTo(1);
    }

    // --- @PrePersist createdAt auto-population ---

    @Test
    void shouldPopulateCreatedAt_onSave() {
        Date before = new Date();
        quoteRepository.save(quote);
        Date after = new Date();

        Quote found = quoteRepository.findById("Q-2025-000001").get();

        assertThat(found.getCreatedAt())
                .isNotNull()
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
    }

    // --- exists ---

    @Test
    void shouldReturnTrue_whenQuoteExists() {
        quoteRepository.save(quote);

        assertThat(quoteRepository.existsById("Q-2025-000001")).isTrue();
    }

    @Test
    void shouldReturnFalse_whenQuoteDoesNotExist() {
        assertThat(quoteRepository.existsById("Q-9999-999999")).isFalse();
    }

    // --- Helpers ---

    private Quote buildQuote(String quoteId, int flightId, String seatClass, int quantity) {
        Quote q = new Quote();
        q.setQuoteId(quoteId);
        q.setFlightId(flightId);
        q.setSeatClass(seatClass);
        q.setQuantity(quantity);
        q.setTravelerId(7);
        q.setTravelerName("Alice");
        q.setPricePerSeat(500_000L);
        q.setTotalPrice(500_000L * quantity);
        q.setExpiresAt(new Date(System.currentTimeMillis() + 86_400_000L));
        q.setStatus(Quote.QuoteStatus.CREATED);
        return q;
    }
}
