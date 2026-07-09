package com.galaxium.holdservice.service;

import com.galaxium.holdservice.api.dto.CreateQuoteRequest;
import com.galaxium.holdservice.domain.AuditEvent;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.QuoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuoteServiceTest {

    @Mock
    private QuoteRepository quoteRepository;

    @Mock
    private AuditEventRepository auditEventRepository;

    @InjectMocks
    private QuoteService quoteService;

    // Use the real PricingService — it has no external dependencies.
    private final PricingService realPricingService = new PricingService();

    @BeforeEach
    void setUp() {
        // Manually inject the real PricingService because @InjectMocks only
        // handles @Mock-annotated fields; PricingService is not mocked here.
        org.springframework.test.util.ReflectionTestUtils.setField(
                quoteService, "pricingService", realPricingService);
    }

    private CreateQuoteRequest buildRequest(int flightId, String seatClass, int quantity) {
        CreateQuoteRequest req = new CreateQuoteRequest();
        req.setFlightId(flightId);
        req.setSeatClass(seatClass);
        req.setQuantity(quantity);
        req.setTravelerId(42);
        req.setTravelerName("Alice");
        return req;
    }

    /** Simulate repository.save() returning the argument unchanged. */
    private void stubSaveReturnsArgument() {
        when(quoteRepository.save(any(Quote.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // --- createQuote ---

    @Test
    void shouldReturnSavedQuote_whenRequestIsValid() {
        when(quoteRepository.count()).thenReturn(0L);
        stubSaveReturnsArgument();

        Quote result = quoteService.createQuote(buildRequest(1, "economy", 2));

        assertThat(result).isNotNull();
        assertThat(result.getFlightId()).isEqualTo(1);
        assertThat(result.getSeatClass()).isEqualTo("economy");
        assertThat(result.getQuantity()).isEqualTo(2);
        assertThat(result.getTravelerId()).isEqualTo(42);
        assertThat(result.getTravelerName()).isEqualTo("Alice");
        assertThat(result.getStatus()).isEqualTo(Quote.QuoteStatus.CREATED);
    }

    @Test
    void shouldCallRepositorySaveOnce_whenCreatingQuote() {
        when(quoteRepository.count()).thenReturn(0L);
        stubSaveReturnsArgument();

        quoteService.createQuote(buildRequest(1, "economy", 1));

        verify(quoteRepository, times(1)).save(any(Quote.class));
    }

    @Test
    void shouldGenerateQuoteIdMatchingPattern_whenCreatingQuote() {
        when(quoteRepository.count()).thenReturn(0L);
        stubSaveReturnsArgument();

        Quote result = quoteService.createQuote(buildRequest(1, "economy", 1));

        // Pattern: Q-<year>-<6-digit-count>
        assertThat(result.getQuoteId()).matches("Q-\\d{4}-\\d{6}");
    }

    @Test
    void shouldSetExpiryApproximately24HoursFromNow_whenCreatingQuote() {
        when(quoteRepository.count()).thenReturn(0L);
        stubSaveReturnsArgument();

        long before = System.currentTimeMillis();
        Quote result = quoteService.createQuote(buildRequest(1, "economy", 1));
        long after = System.currentTimeMillis();

        long expiresAt = result.getExpiresAt().getTime();
        long expectedMin = before + 23 * 60 * 60 * 1000L; // 23 h tolerance
        long expectedMax = after  + 25 * 60 * 60 * 1000L; // 25 h tolerance
        assertThat(expiresAt).isBetween(expectedMin, expectedMax);
    }

    @Test
    void shouldCalculateTotalPriceAsPricePerSeatTimesQuantity_whenCreatingQuote() {
        when(quoteRepository.count()).thenReturn(0L);
        stubSaveReturnsArgument();

        int quantity = 3;
        // flightId=3 → multiplier 1.0, economy → pricePerSeat = 500_000
        Quote result = quoteService.createQuote(buildRequest(3, "economy", quantity));

        assertThat(result.getPricePerSeat()).isEqualTo(500_000L);
        assertThat(result.getTotalPrice()).isEqualTo(500_000L * quantity);
    }

    @Test
    void shouldCreateAuditEvent_whenCreatingQuote() {
        when(quoteRepository.count()).thenReturn(0L);
        stubSaveReturnsArgument();

        quoteService.createQuote(buildRequest(1, "economy", 1));

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository, times(1)).save(captor.capture());

        AuditEvent event = captor.getValue();
        assertThat(event.getEntityType()).isEqualTo("QUOTE");
        assertThat(event.getEventType()).isEqualTo("CREATED");
    }

    // --- getQuote ---

    @Test
    void shouldReturnQuote_whenQuoteExists() {
        Quote quote = new Quote();
        quote.setQuoteId("Q-2024-000001");
        when(quoteRepository.findById("Q-2024-000001")).thenReturn(Optional.of(quote));

        Quote result = quoteService.getQuote("Q-2024-000001");

        assertThat(result).isSameAs(quote);
    }

    @Test
    void shouldReturnNull_whenQuoteNotFound() {
        when(quoteRepository.findById("unknown")).thenReturn(Optional.empty());

        Quote result = quoteService.getQuote("unknown");

        assertThat(result).isNull();
    }
}
