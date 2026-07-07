package com.galaxium.holdservice.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

@Component
public class PythonBackendClient {

    private static final Logger log = LoggerFactory.getLogger(PythonBackendClient.class);

    private static final int CONNECT_TIMEOUT_MILLIS = 10 * 1000;
    private static final int READ_TIMEOUT_MILLIS = 30 * 1000;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${python.backend.url}")
    private String pythonBackendUrl;

    public BookingResponse createBookingFromHold(Map<String, Object> holdData) {
        HttpURLConnection connection = null;
        try {
            String url = pythonBackendUrl + "/internal/bookings/from-hold";
            String requestBody = objectMapper.writeValueAsString(holdData);

            log.info("Calling Python backend to create booking: " + url);

            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
            connection.setReadTimeout(READ_TIMEOUT_MILLIS);
            connection.setDoOutput(true);

            OutputStream out = connection.getOutputStream();
            try {
                out.write(requestBody.getBytes("UTF-8"));
                out.flush();
            } finally {
                out.close();
            }

            int statusCode = connection.getResponseCode();
            String responseBody = readBody(statusCode >= 200 && statusCode < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream());

            if (statusCode >= 200 && statusCode < 300) {
                BookingResponse bookingResponse = objectMapper.readValue(responseBody, BookingResponse.class);
                log.info("Booking created successfully: " + bookingResponse.getBookingId());
                return bookingResponse;
            } else {
                log.error("Failed to create booking. Status: " + statusCode + ", Body: " + responseBody);
                throw new BookingCreationException("Failed to create booking: " + responseBody);
            }
        } catch (BookingCreationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error calling Python backend", e);
            throw new BookingCreationException("Error calling Python backend: " + e.getMessage(), e);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private String readBody(InputStream stream) throws Exception {
        if (stream == null) {
            return "";
        }
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
        try {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } finally {
            reader.close();
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
