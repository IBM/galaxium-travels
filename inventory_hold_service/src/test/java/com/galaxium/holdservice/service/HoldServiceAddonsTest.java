package com.galaxium.holdservice.service;

import com.galaxium.holdservice.client.PythonBackendClient;
import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.HoldRepository;
import com.galaxium.holdservice.repository.QuoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class HoldServiceAddonsTest {

    private HoldRepository holdRepository;
    private QuoteRepository quoteRepository;
    private AuditEventRepository auditEventRepository;
    private PythonBackendClient pythonBackendClient;
    private HoldService holdService;

    @BeforeEach
    void setUp() {
        holdRepository = mock(HoldRepository.class);
        quoteRepository = mock(QuoteRepository.class);
        auditEventRepository = mock(AuditEventRepository.class);
        pythonBackendClient = mock(PythonBackendClient.class);
        holdService = new HoldService(holdRepository, quoteRepository, auditEventRepository, pythonBackendClient);
        ReflectionTestUtils.setField(holdService, "holdDurationMinutes", 15);
    }

    @Test
    void confirmHold_passesAddonsToPythonBackend() {
        Hold hold = Hold.builder()
                .holdId("H-2026-000001")
                .quoteId("Q-2026-000001")
                .status(Hold.HoldStatus.HELD)
                .reservedUntil(Instant.now().plusSeconds(600))
                .build();

        Quote quote = Quote.builder()
                .quoteId("Q-2026-000001")
                .flightId(42)
                .seatClass("economy")
                .travelerId(7)
                .travelerName("Test User")
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        PythonBackendClient.BookingResponse bookingResponse = new PythonBackendClient.BookingResponse();
        bookingResponse.setBookingId(123);

        List<Map<String, Object>> addons = List.of(
                Map.of("id", "wifi", "price", 45, "selected", true),
                Map.of("id", "insurance", "price", 200, "selected", true)
        );

        when(holdRepository.findById("H-2026-000001")).thenReturn(Optional.of(hold));
        when(quoteRepository.findById("Q-2026-000001")).thenReturn(Optional.of(quote));
        when(pythonBackendClient.createBookingFromHold(anyMap())).thenReturn(bookingResponse);
        when(holdRepository.save(hold)).thenReturn(hold);

        Hold confirmed = holdService.confirmHold("H-2026-000001", addons);

        verify(pythonBackendClient).createBookingFromHold(Map.of(
                "user_id", 7,
                "traveler_name", "Test User",
                "flight_id", 42,
                "seat_class", "economy",
                "addons", addons
        ));
        assertSame(hold, confirmed);
        assertEquals(Hold.HoldStatus.CONFIRMED, hold.getStatus());
        assertEquals("123", hold.getExternalBookingReference());
    }

    @Test
    void confirmHold_omitsAddonsWhenNoneProvided() {
        Hold hold = Hold.builder()
                .holdId("H-2026-000002")
                .quoteId("Q-2026-000002")
                .status(Hold.HoldStatus.HELD)
                .reservedUntil(Instant.now().plusSeconds(600))
                .build();

        Quote quote = Quote.builder()
                .quoteId("Q-2026-000002")
                .flightId(99)
                .seatClass("business")
                .travelerId(8)
                .travelerName("No Addons")
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        PythonBackendClient.BookingResponse bookingResponse = new PythonBackendClient.BookingResponse();
        bookingResponse.setBookingId(456);

        when(holdRepository.findById("H-2026-000002")).thenReturn(Optional.of(hold));
        when(quoteRepository.findById("Q-2026-000002")).thenReturn(Optional.of(quote));
        when(pythonBackendClient.createBookingFromHold(anyMap())).thenReturn(bookingResponse);
        when(holdRepository.save(hold)).thenReturn(hold);

        holdService.confirmHold("H-2026-000002", null);

        verify(pythonBackendClient).createBookingFromHold(Map.of(
                "user_id", 8,
                "traveler_name", "No Addons",
                "flight_id", 99,
                "seat_class", "business"
        ));
    }
}

// Made with Bob
