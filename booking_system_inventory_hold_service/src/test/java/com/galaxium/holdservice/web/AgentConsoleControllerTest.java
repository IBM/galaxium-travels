package com.galaxium.holdservice.web;

import com.galaxium.holdservice.domain.AuditEvent;
import com.galaxium.holdservice.domain.Hold;
import com.galaxium.holdservice.domain.Quote;
import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.HoldRepository;
import com.galaxium.holdservice.repository.QuoteRepository;
import com.galaxium.holdservice.service.HoldService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Collections;
import java.util.Date;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@WebMvcTest(AgentConsoleController.class)
class AgentConsoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private HoldRepository holdRepository;

    @MockBean
    private QuoteRepository quoteRepository;

    @MockBean
    private AuditEventRepository auditEventRepository;

    @MockBean
    private HoldService holdService;

    // -----------------------------------------------------------------------
    // GET /console
    // -----------------------------------------------------------------------

    @Test
    void shouldReturnIndexView_withCounts() throws Exception {
        when(holdRepository.count()).thenReturn(3L);
        when(quoteRepository.count()).thenReturn(5L);
        when(auditEventRepository.count()).thenReturn(12L);

        mockMvc.perform(get("/console"))
                .andExpect(status().isOk())
                .andExpect(view().name("console/index"))
                .andExpect(model().attribute("holdCount", 3L))
                .andExpect(model().attribute("quoteCount", 5L))
                .andExpect(model().attribute("auditCount", 12L));
    }

    @Test
    void shouldReturnIndexView_withZeroCounts() throws Exception {
        when(holdRepository.count()).thenReturn(0L);
        when(quoteRepository.count()).thenReturn(0L);
        when(auditEventRepository.count()).thenReturn(0L);

        mockMvc.perform(get("/console"))
                .andExpect(status().isOk())
                .andExpect(view().name("console/index"))
                .andExpect(model().attribute("holdCount", 0L))
                .andExpect(model().attribute("quoteCount", 0L))
                .andExpect(model().attribute("auditCount", 0L));
    }

    // -----------------------------------------------------------------------
    // GET /console/holds
    // -----------------------------------------------------------------------

    @Test
    void shouldReturnHoldsView_withHoldsList() throws Exception {
        Hold hold = buildHold("H-2025-000001", "Q-2025-000001", Hold.HoldStatus.HELD);
        when(holdRepository.findAll()).thenReturn(Collections.singletonList(hold));

        mockMvc.perform(get("/console/holds"))
                .andExpect(status().isOk())
                .andExpect(view().name("console/holds"))
                .andExpect(model().attribute("holds", Collections.singletonList(hold)));
    }

    @Test
    void shouldReturnHoldsView_withEmptyList() throws Exception {
        when(holdRepository.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/console/holds"))
                .andExpect(status().isOk())
                .andExpect(view().name("console/holds"))
                .andExpect(model().attribute("holds", Collections.emptyList()));
    }

    // -----------------------------------------------------------------------
    // POST /console/holds/{holdId}/release
    // -----------------------------------------------------------------------

    @Test
    void shouldRedirectWithSuccessMessage_whenReleaseHoldSucceeds() throws Exception {
        mockMvc.perform(post("/console/holds/H-2025-000001/release"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("/console/holds?message=*"));

        verify(holdService).releaseHold("H-2025-000001");
    }

    @Test
    void shouldRedirectWithSuccessMessage_containingHoldId_whenReleaseSucceeds() throws Exception {
        mockMvc.perform(post("/console/holds/H-2025-000001/release"))
                .andExpect(redirectedUrlPattern("/console/holds?message=Hold+H-2025-000001*"));
    }

    @Test
    void shouldRedirectWithErrorMessage_whenReleaseHoldThrowsIllegalArgumentException() throws Exception {
        when(holdService.releaseHold("H-UNKNOWN"))
                .thenThrow(new IllegalArgumentException("Hold not found: H-UNKNOWN"));

        mockMvc.perform(post("/console/holds/H-UNKNOWN/release"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("/console/holds?message=Could+not+release*"));
    }

    @Test
    void shouldRedirectWithErrorMessage_whenReleaseHoldThrowsIllegalStateException() throws Exception {
        when(holdService.releaseHold("H-2025-000001"))
                .thenThrow(new IllegalStateException("Hold cannot be released, current status: CONFIRMED"));

        mockMvc.perform(post("/console/holds/H-2025-000001/release"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("/console/holds?message=Could+not+release*"));
    }

    // -----------------------------------------------------------------------
    // GET /console/quotes
    // -----------------------------------------------------------------------

    @Test
    void shouldReturnQuotesView_withQuotesList() throws Exception {
        Quote quote = buildQuote("Q-2025-000001");
        when(quoteRepository.findAll()).thenReturn(Collections.singletonList(quote));

        mockMvc.perform(get("/console/quotes"))
                .andExpect(status().isOk())
                .andExpect(view().name("console/quotes"))
                .andExpect(model().attribute("quotes", Collections.singletonList(quote)));
    }

    @Test
    void shouldReturnQuotesView_withEmptyList() throws Exception {
        when(quoteRepository.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/console/quotes"))
                .andExpect(status().isOk())
                .andExpect(view().name("console/quotes"))
                .andExpect(model().attribute("quotes", Collections.emptyList()));
    }

    // -----------------------------------------------------------------------
    // GET /console/audit
    // -----------------------------------------------------------------------

    @Test
    void shouldReturnAuditView_withEventsList() throws Exception {
        AuditEvent event = buildAuditEvent("HOLD", "H-2025-000001", "CREATED");
        when(auditEventRepository.findTop50ByOrderByCreatedAtDesc())
                .thenReturn(Collections.singletonList(event));

        mockMvc.perform(get("/console/audit"))
                .andExpect(status().isOk())
                .andExpect(view().name("console/audit"))
                .andExpect(model().attribute("events", Collections.singletonList(event)));
    }

    @Test
    void shouldReturnAuditView_withMultipleEvents() throws Exception {
        AuditEvent e1 = buildAuditEvent("HOLD", "H-2025-000002", "RELEASED");
        AuditEvent e2 = buildAuditEvent("HOLD", "H-2025-000001", "CREATED");
        when(auditEventRepository.findTop50ByOrderByCreatedAtDesc())
                .thenReturn(Arrays.asList(e1, e2));

        mockMvc.perform(get("/console/audit"))
                .andExpect(status().isOk())
                .andExpect(view().name("console/audit"))
                .andExpect(model().attribute("events", Arrays.asList(e1, e2)));
    }

    @Test
    void shouldReturnAuditView_withEmptyList() throws Exception {
        when(auditEventRepository.findTop50ByOrderByCreatedAtDesc())
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/console/audit"))
                .andExpect(status().isOk())
                .andExpect(view().name("console/audit"))
                .andExpect(model().attribute("events", Collections.emptyList()));
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

    private Quote buildQuote(String quoteId) {
        Quote quote = new Quote();
        quote.setQuoteId(quoteId);
        quote.setFlightId(101);
        quote.setSeatClass("economy");
        quote.setQuantity(2);
        quote.setTravelerId(1);
        quote.setTravelerName("Alice Smith");
        quote.setPricePerSeat(500_000L);
        quote.setTotalPrice(1_000_000L);
        quote.setExpiresAt(new Date(System.currentTimeMillis() + 86_400_000L));
        quote.setStatus(Quote.QuoteStatus.CREATED);
        return quote;
    }

    private AuditEvent buildAuditEvent(String entityType, String entityId, String eventType) {
        AuditEvent event = new AuditEvent();
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setEventType(eventType);
        event.setDetails("Test audit detail");
        return event;
    }
}
