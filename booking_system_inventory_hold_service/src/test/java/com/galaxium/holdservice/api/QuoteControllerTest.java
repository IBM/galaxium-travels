package com.galaxium.holdservice.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.galaxium.holdservice.api.dto.CreateQuoteRequest;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.service.QuoteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(QuoteController.class)
class QuoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private QuoteService quoteService;

    private Quote buildQuote() {
        return Quote.builder()
                .quoteId("Q-2025-000001")
                .flightId(42)
                .seatClass("ECONOMY")
                .quantity(2)
                .travelerId(1)
                .travelerName("Jane Doe")
                .pricePerSeat(15000L)
                .totalPrice(30000L)
                .expiresAt(Instant.now().plus(24, ChronoUnit.HOURS))
                .status(Quote.QuoteStatus.CREATED)
                .createdAt(Instant.now())
                .build();
    }

    private CreateQuoteRequest buildValidRequest() {
        return CreateQuoteRequest.builder()
                .flightId(42)
                .seatClass("ECONOMY")
                .quantity(2)
                .travelerId(1)
                .travelerName("Jane Doe")
                .build();
    }

    @Test
    void testPostQuoteValid() throws Exception {
        when(quoteService.createQuote(any())).thenReturn(buildQuote());

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequest())))
                .andExpect(status().isCreated());
    }

    @Test
    void testPostQuoteReturnsCreatedStatus() throws Exception {
        when(quoteService.createQuote(any())).thenReturn(buildQuote());

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequest())))
                .andExpect(status().isCreated());
    }

    @Test
    void testPostQuoteReturnsQuoteObject() throws Exception {
        Quote quote = buildQuote();
        when(quoteService.createQuote(any())).thenReturn(quote);

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequest())))
                .andExpect(jsonPath("$.quoteId").value("Q-2025-000001"))
                .andExpect(jsonPath("$.flightId").value(42))
                .andExpect(jsonPath("$.seatClass").value("ECONOMY"));
    }

    @Test
    void testPostQuoteMissingFields() throws Exception {
        String emptyBody = "{}";

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(emptyBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testPostQuoteInvalidRequest() throws Exception {
        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("not-json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testGetQuoteExists() throws Exception {
        Quote quote = buildQuote();
        when(quoteService.getQuote("Q-2025-000001")).thenReturn(Optional.of(quote));

        mockMvc.perform(get("/api/v1/quotes/Q-2025-000001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quoteId").value("Q-2025-000001"));
    }

    @Test
    void testGetQuoteNotFound() throws Exception {
        when(quoteService.getQuote("Q-MISSING")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/quotes/Q-MISSING"))
                .andExpect(status().isNotFound());
    }
}
