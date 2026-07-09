package com.galaxium.holdservice.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.*;

class PythonBackendClientTest {

    private WireMockServer wireMockServer;
    private PythonBackendClient client;

    @BeforeEach
    void setUp() {
        wireMockServer = new WireMockServer(WireMockConfiguration.wireMockConfig().dynamicPort());
        wireMockServer.start();

        client = new PythonBackendClient();
        ReflectionTestUtils.setField(client, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(client, "pythonBackendUrl", "http://localhost:" + wireMockServer.port());
    }

    @AfterEach
    void tearDown() {
        wireMockServer.stop();
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    private Map<String, Object> holdData() {
        Map<String, Object> data = new HashMap<>();
        data.put("holdId", "H-2024-000001");
        data.put("userId", 42);
        data.put("flightId", 7);
        data.put("seatClass", "economy");
        data.put("quantity", 2);
        return data;
    }

    // -----------------------------------------------------------------------
    // 200 — happy path
    // -----------------------------------------------------------------------

    @Test
    void shouldReturnBookingResponse_whenServerReturns200WithValidJson() {
        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"booking_id\":101,\"user_id\":42,\"flight_id\":7," +
                                  "\"seat_class\":\"economy\",\"status\":\"booked\"}")));

        PythonBackendClient.BookingResponse response = client.createBookingFromHold(holdData());

        assertThat(response).isNotNull();
        assertThat(response.getBookingId()).isEqualTo(101);
        assertThat(response.getUserId()).isEqualTo(42);
        assertThat(response.getFlightId()).isEqualTo(7);
        assertThat(response.getSeatClass()).isEqualTo("economy");
        assertThat(response.getStatus()).isEqualTo("booked");
    }

    @Test
    void shouldReturnBookingResponse_whenServerReturns201WithValidJson() {
        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(201)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"booking_id\":202,\"user_id\":5,\"flight_id\":3," +
                                  "\"seat_class\":\"business\",\"status\":\"booked\"}")));

        PythonBackendClient.BookingResponse response = client.createBookingFromHold(holdData());

        assertThat(response.getBookingId()).isEqualTo(202);
        assertThat(response.getSeatClass()).isEqualTo("business");
    }

    @Test
    void shouldPostRequestBodyAsJson_whenCalled() {
        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"booking_id\":1,\"user_id\":1,\"flight_id\":1," +
                                  "\"seat_class\":\"economy\",\"status\":\"booked\"}")));

        client.createBookingFromHold(holdData());

        wireMockServer.verify(postRequestedFor(urlEqualTo("/internal/bookings/from-hold"))
                .withHeader("Content-Type", containing("application/json")));
    }

    // -----------------------------------------------------------------------
    // Non-2xx — error body forwarded in exception message
    // -----------------------------------------------------------------------

    @Test
    void shouldThrowBookingCreationException_whenServerReturns400() {
        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(400)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"error\":\"invalid request\"}")));

        assertThatThrownBy(() -> client.createBookingFromHold(holdData()))
                .isInstanceOf(PythonBackendClient.BookingCreationException.class)
                .hasMessageContaining("invalid request");
    }

    @Test
    void shouldThrowBookingCreationException_whenServerReturns500() {
        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(500)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"error\":\"internal server error\"}")));

        assertThatThrownBy(() -> client.createBookingFromHold(holdData()))
                .isInstanceOf(PythonBackendClient.BookingCreationException.class)
                .hasMessageContaining("internal server error");
    }

    // -----------------------------------------------------------------------
    // Null / empty error stream on non-2xx
    // -----------------------------------------------------------------------

    @Test
    void shouldThrowBookingCreationException_withoutNpe_whenNon2xxHasNoErrorBody() {
        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(503)
                        .withBody("")));

        // Must not throw NullPointerException — graceful empty-body handling
        assertThatThrownBy(() -> client.createBookingFromHold(holdData()))
                .isInstanceOf(PythonBackendClient.BookingCreationException.class)
                .isNotInstanceOf(NullPointerException.class);
    }

    // -----------------------------------------------------------------------
    // Connection failure / IOException
    // -----------------------------------------------------------------------

    @Test
    void shouldThrowBookingCreationException_wrappingIoException_whenConnectionRefused() {
        // Point the client at a port where nothing is listening
        ReflectionTestUtils.setField(client, "pythonBackendUrl", "http://localhost:1");

        assertThatThrownBy(() -> client.createBookingFromHold(holdData()))
                .isInstanceOf(PythonBackendClient.BookingCreationException.class)
                .hasMessageContaining("Error calling Python backend")
                .hasCauseInstanceOf(Exception.class);
    }
}
