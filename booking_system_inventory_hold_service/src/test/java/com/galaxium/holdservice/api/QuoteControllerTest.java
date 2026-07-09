package com.galaxium.holdservice.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.service.QuoteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(QuoteController.class)
class QuoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private QuoteService quoteService;

    @Autowired
    private ObjectMapper objectMapper;

    // -----------------------------------------------------------------------
    // POST /api/v1/quotes
    // -----------------------------------------------------------------------

    @Test
    void shouldReturn201_whenCreateQuoteRequestIsValid() throws Exception {
        Quote saved = buildQuote("Q-2025-000001");

        when(quoteService.createQuote(any())).thenReturn(saved);

        String body = buildValidRequestJson();

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.quoteId").value("Q-2025-000001"))
                .andExpect(jsonPath("$.flightId").value(42))
                .andExpect(jsonPath("$.seatClass").value("economy"))
                .andExpect(jsonPath("$.quantity").value(2));
    }

    @Test
    void shouldReturn400_whenFlightIdIsMissing() throws Exception {
        Map<String, Object> req = new HashMap<String, Object>();
        req.put("seatClass", "economy");
        req.put("quantity", 1);
        req.put("travelerId", 7);
        req.put("travelerName", "Alice");

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400_whenSeatClassIsBlank() throws Exception {
        Map<String, Object> req = new HashMap<String, Object>();
        req.put("flightId", 42);
        req.put("seatClass", "");
        req.put("quantity", 1);
        req.put("travelerId", 7);
        req.put("travelerName", "Alice");

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400_whenQuantityIsZero() throws Exception {
        Map<String, Object> req = new HashMap<String, Object>();
        req.put("flightId", 42);
        req.put("seatClass", "economy");
        req.put("quantity", 0);
        req.put("travelerId", 7);
        req.put("travelerName", "Alice");

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400_whenTravelerIdIsMissing() throws Exception {
        Map<String, Object> req = new HashMap<String, Object>();
        req.put("flightId", 42);
        req.put("seatClass", "economy");
        req.put("quantity", 1);
        req.put("travelerName", "Alice");

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400_whenTravelerNameIsBlank() throws Exception {
        Map<String, Object> req = new HashMap<String, Object>();
        req.put("flightId", 42);
        req.put("seatClass", "economy");
        req.put("quantity", 1);
        req.put("travelerId", 7);
        req.put("travelerName", "");

        mockMvc.perform(post("/api/v1/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/quotes/{quoteId}
    // -----------------------------------------------------------------------

    @Test
    void shouldReturn200WithBody_whenQuoteExists() throws Exception {
        Quote quote = buildQuote("Q-2025-000001");

        when(quoteService.getQuote("Q-2025-000001")).thenReturn(quote);

        mockMvc.perform(get("/api/v1/quotes/Q-2025-000001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quoteId").value("Q-2025-000001"));
    }

    @Test
    void shouldReturn404_whenQuoteDoesNotExist() throws Exception {
        when(quoteService.getQuote("Q-9999-000099")).thenReturn(null);

        mockMvc.perform(get("/api/v1/quotes/Q-9999-000099"))
                .andExpect(status().isNotFound());
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private Quote buildQuote(String quoteId) {
        Quote q = new Quote();
        q.setQuoteId(quoteId);
        q.setFlightId(42);
        q.setSeatClass("economy");
        q.setQuantity(2);
        q.setTravelerId(7);
        q.setTravelerName("Alice");
        q.setPricePerSeat(500_000L);
        q.setTotalPrice(1_000_000L);
        q.setExpiresAt(new Date(System.currentTimeMillis() + 86_400_000L));
        q.setStatus(Quote.QuoteStatus.CREATED);
        return q;
    }

    private String buildValidRequestJson() throws Exception {
        Map<String, Object> req = new HashMap<String, Object>();
        req.put("flightId", 42);
        req.put("seatClass", "economy");
        req.put("quantity", 2);
        req.put("travelerId", 7);
        req.put("travelerName", "Alice");
        return objectMapper.writeValueAsString(req);
    }
}
