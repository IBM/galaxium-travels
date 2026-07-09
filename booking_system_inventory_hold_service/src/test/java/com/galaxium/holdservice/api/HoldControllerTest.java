package com.galaxium.holdservice.api;

import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.service.HoldService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Date;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HoldController.class)
class HoldControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private HoldService holdService;

    // -----------------------------------------------------------------------
    // POST /api/v1/quotes/{quoteId}/holds
    // -----------------------------------------------------------------------

    @Test
    void shouldReturn201WithBody_whenHoldCreatedSuccessfully() throws Exception {
        Hold hold = buildHold("H-2025-000001", "Q-2025-000001", Hold.HoldStatus.HELD);

        when(holdService.createHold("Q-2025-000001")).thenReturn(hold);

        mockMvc.perform(post("/api/v1/quotes/Q-2025-000001/holds"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.holdId").value("H-2025-000001"))
                .andExpect(jsonPath("$.quoteId").value("Q-2025-000001"))
                .andExpect(jsonPath("$.status").value("HELD"));
    }

    @Test
    void shouldReturn404_whenCreateHoldAndQuoteNotFound() throws Exception {
        when(holdService.createHold("Q-UNKNOWN")).thenThrow(
                new IllegalArgumentException("Quote not found: Q-UNKNOWN"));

        mockMvc.perform(post("/api/v1/quotes/Q-UNKNOWN/holds"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn400_whenCreateHoldAndQuoteExpired() throws Exception {
        when(holdService.createHold("Q-2025-000001")).thenThrow(
                new IllegalStateException("Quote has expired"));

        mockMvc.perform(post("/api/v1/quotes/Q-2025-000001/holds"))
                .andExpect(status().isBadRequest());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/holds/{holdId}
    // -----------------------------------------------------------------------

    @Test
    void shouldReturn200WithBody_whenHoldExists() throws Exception {
        Hold hold = buildHold("H-2025-000001", "Q-2025-000001", Hold.HoldStatus.HELD);

        when(holdService.getHold("H-2025-000001")).thenReturn(hold);

        mockMvc.perform(get("/api/v1/holds/H-2025-000001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.holdId").value("H-2025-000001"));
    }

    @Test
    void shouldReturn404_whenHoldDoesNotExist() throws Exception {
        when(holdService.getHold("H-UNKNOWN")).thenReturn(null);

        mockMvc.perform(get("/api/v1/holds/H-UNKNOWN"))
                .andExpect(status().isNotFound());
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/holds/{holdId}/confirm
    // -----------------------------------------------------------------------

    @Test
    void shouldReturn200WithBody_whenHoldConfirmedSuccessfully() throws Exception {
        Hold hold = buildHold("H-2025-000001", "Q-2025-000001", Hold.HoldStatus.CONFIRMED);
        hold.setExternalBookingReference("BK-999");

        when(holdService.confirmHold("H-2025-000001")).thenReturn(hold);

        mockMvc.perform(post("/api/v1/holds/H-2025-000001/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.holdId").value("H-2025-000001"))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.externalBookingReference").value("BK-999"));
    }

    @Test
    void shouldReturn404_whenConfirmHoldAndHoldNotFound() throws Exception {
        when(holdService.confirmHold("H-UNKNOWN")).thenThrow(
                new IllegalArgumentException("Hold not found: H-UNKNOWN"));

        mockMvc.perform(post("/api/v1/holds/H-UNKNOWN/confirm"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn400_whenConfirmHoldInInvalidState() throws Exception {
        when(holdService.confirmHold("H-2025-000001")).thenThrow(
                new IllegalStateException("Hold is not in HELD status: RELEASED"));

        mockMvc.perform(post("/api/v1/holds/H-2025-000001/confirm"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400_whenConfirmHoldAndHoldExpired() throws Exception {
        when(holdService.confirmHold("H-2025-000001")).thenThrow(
                new IllegalStateException("Hold has expired"));

        mockMvc.perform(post("/api/v1/holds/H-2025-000001/confirm"))
                .andExpect(status().isBadRequest());
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/holds/{holdId}/release
    // -----------------------------------------------------------------------

    @Test
    void shouldReturn200WithBody_whenHoldReleasedSuccessfully() throws Exception {
        Hold hold = buildHold("H-2025-000001", "Q-2025-000001", Hold.HoldStatus.RELEASED);

        when(holdService.releaseHold("H-2025-000001")).thenReturn(hold);

        mockMvc.perform(post("/api/v1/holds/H-2025-000001/release"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.holdId").value("H-2025-000001"))
                .andExpect(jsonPath("$.status").value("RELEASED"));
    }

    @Test
    void shouldReturn404_whenReleaseHoldAndHoldNotFound() throws Exception {
        when(holdService.releaseHold("H-UNKNOWN")).thenThrow(
                new IllegalArgumentException("Hold not found: H-UNKNOWN"));

        mockMvc.perform(post("/api/v1/holds/H-UNKNOWN/release"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn400_whenReleaseHoldInInvalidState() throws Exception {
        when(holdService.releaseHold("H-2025-000001")).thenThrow(
                new IllegalStateException("Hold cannot be released, current status: CONFIRMED"));

        mockMvc.perform(post("/api/v1/holds/H-2025-000001/release"))
                .andExpect(status().isBadRequest());
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private Hold buildHold(String holdId, String quoteId, Hold.HoldStatus status) {
        Hold hold = new Hold();
        hold.setHoldId(holdId);
        hold.setQuoteId(quoteId);
        hold.setStatus(status);
        hold.setReservedUntil(new Date(System.currentTimeMillis() + 900_000L));
        return hold;
    }
}
