package com.galaxium.holdservice.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class PythonBackendClient {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${python.backend.url}")
    private String pythonBackendUrl;

    public BookingResponse createBookingFromHold(Map<String, Object> holdData) {
        try {
            String url = pythonBackendUrl + "/internal/bookings/from-hold";
            String requestBody = objectMapper.writeValueAsString(holdData);

            log.info("Calling Python backend to create booking: {}", url);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                BookingResponse bookingResponse = objectMapper.readValue(response.body(), BookingResponse.class);
                log.info("Booking created successfully: {}", bookingResponse.getBookingId());
                return bookingResponse;
            } else {
                log.error("Failed to create booking. Status: {}, Body: {}", response.statusCode(), response.body());
                throw new BookingCreationException("Failed to create booking: " + response.body());
            }
        } catch (Exception e) {
            log.error("Error calling Python backend", e);
            throw new BookingCreationException("Error calling Python backend: " + e.getMessage(), e);
        }
    }

    public static class BookingResponse {
        @JsonProperty("booking_id")
        private Integer bookingId;
        @JsonProperty("user_id")
        private Integer userId;
        @JsonProperty("flight_id")
        private Integer flightId;
        @JsonProperty("seat_class")
        private String seatClass;
        private String status;

        // Getters and setters
        public Integer getBookingId() { return bookingId; }
        public void setBookingId(Integer bookingId) { this.bookingId = bookingId; }
        public Integer getUserId() { return userId; }
        public void setUserId(Integer userId) { this.userId = userId; }
        public Integer getFlightId() { return flightId; }
        public void setFlightId(Integer flightId) { this.flightId = flightId; }
        public String getSeatClass() { return seatClass; }
        public void setSeatClass(String seatClass) { this.seatClass = seatClass; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class BookingCreationException extends RuntimeException {
        public BookingCreationException(String message) {
            super(message);
        }
        public BookingCreationException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}

// Made with Bob
