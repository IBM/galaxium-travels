package com.galaxium.holdservice.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

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

        client = new PythonBackendClient(new ObjectMapper());
        ReflectionTestUtils.setField(client, "pythonBackendUrl", "http://localhost:" + wireMockServer.port());
    }

    @AfterEach
    void tearDown() {
        wireMockServer.stop();
    }

    // -------------------------------------------------------------------------
    // testCreateBookingFromHoldSuccess
    // -------------------------------------------------------------------------

    @Test
    void testCreateBookingFromHoldSuccess() throws Exception {
        // Arrange
        String responseJson = """
                {
                    "booking_id": 42,
                    "user_id": 7,
                    "flight_id": 3,
                    "seat_class": "economy",
                    "status": "CONFIRMED"
                }
                """;

        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .withHeader("Content-Type", equalTo("application/json"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, Object> holdData = Map.of("holdId", "H-001", "userId", 7, "flightId", 3);

        // Act
        PythonBackendClient.BookingResponse result = client.createBookingFromHold(holdData);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getBookingId()).isEqualTo(42);
        assertThat(result.getUserId()).isEqualTo(7);
        assertThat(result.getFlightId()).isEqualTo(3);
        assertThat(result.getSeatClass()).isEqualTo("economy");
        assertThat(result.getStatus()).isEqualTo("CONFIRMED");
    }

    // -------------------------------------------------------------------------
    // testCreateBookingFromHoldJsonParsing
    // -------------------------------------------------------------------------

    @Test
    void testCreateBookingFromHoldJsonParsing() throws Exception {
        // Arrange — all fields present with snake_case keys
        String responseJson = """
                {
                    "booking_id": 99,
                    "user_id": 1,
                    "flight_id": 5,
                    "seat_class": "business",
                    "status": "PENDING"
                }
                """;

        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(201)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, Object> holdData = Map.of("holdId", "H-002");

        // Act
        PythonBackendClient.BookingResponse result = client.createBookingFromHold(holdData);

        // Assert — verifies @JsonProperty("booking_id") etc. deserialization
        assertThat(result.getBookingId()).isEqualTo(99);
        assertThat(result.getSeatClass()).isEqualTo("business");
        assertThat(result.getStatus()).isEqualTo("PENDING");
    }

    // -------------------------------------------------------------------------
    // testCreateBookingFromHoldHttpError
    // -------------------------------------------------------------------------

    @Test
    void testCreateBookingFromHoldHttpError() {
        // Arrange — server returns 500
        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(500)
                        .withBody("Internal Server Error")));

        Map<String, Object> holdData = Map.of("holdId", "H-003");

        // Act & Assert
        assertThatThrownBy(() -> client.createBookingFromHold(holdData))
                .isInstanceOf(PythonBackendClient.BookingCreationException.class)
                .hasMessageContaining("Failed to create booking");
    }

    @Test
    void testCreateBookingFromHoldHttpClientError() {
        // Arrange — server returns 400
        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(400)
                        .withBody("Bad Request")));

        Map<String, Object> holdData = Map.of("holdId", "H-004");

        // Act & Assert
        assertThatThrownBy(() -> client.createBookingFromHold(holdData))
                .isInstanceOf(PythonBackendClient.BookingCreationException.class)
                .hasMessageContaining("Failed to create booking");
    }

    // -------------------------------------------------------------------------
    // testCreateBookingFromHoldNetworkTimeout
    // -------------------------------------------------------------------------

    @Test
    void testCreateBookingFromHoldNetworkTimeout() {
        // Arrange — simulate a delayed response beyond the 30s timeout by
        // stopping the server so the TCP connection is refused immediately
        wireMockServer.stop();

        Map<String, Object> holdData = Map.of("holdId", "H-005");

        // Act & Assert
        assertThatThrownBy(() -> client.createBookingFromHold(holdData))
                .isInstanceOf(PythonBackendClient.BookingCreationException.class)
                .hasMessageContaining("Error calling Python backend");
    }

    // -------------------------------------------------------------------------
    // testCreateBookingFromHoldRetryLogic
    // -------------------------------------------------------------------------

    @Test
    void testCreateBookingFromHoldRetryLogic() {
        // The client has no built-in retry logic — verify a single request
        // is made per invocation (no silent retries that could cause side effects).
        String responseJson = """
                {"booking_id": 1, "user_id": 1, "flight_id": 1,
                 "seat_class": "economy", "status": "CONFIRMED"}
                """;

        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, Object> holdData = Map.of("holdId", "H-006");
        client.createBookingFromHold(holdData);

        // Assert exactly one request was sent
        wireMockServer.verify(1, postRequestedFor(urlEqualTo("/internal/bookings/from-hold")));
    }

    // -------------------------------------------------------------------------
    // testCreateBookingFromHoldThrowsBookingCreationException
    // -------------------------------------------------------------------------

    @Test
    void testCreateBookingFromHoldThrowsBookingCreationException() {
        // Arrange — invalid JSON in response body causes deserialization failure
        wireMockServer.stubFor(post(urlEqualTo("/internal/bookings/from-hold"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("not-valid-json")));

        Map<String, Object> holdData = Map.of("holdId", "H-007");

        // Act & Assert — exception is always wrapped in BookingCreationException
        assertThatThrownBy(() -> client.createBookingFromHold(holdData))
                .isInstanceOf(PythonBackendClient.BookingCreationException.class)
                .hasMessageContaining("Error calling Python backend");
    }
}
