package com.galaxium.holdservice.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "quotes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Quote {

    @Id
    @Column(name = "quote_id", nullable = false, length = 50)
    private String quoteId;

    @Column(name = "flight_id", nullable = false)
    private Integer flightId;

    @Column(name = "seat_class", nullable = false, length = 50)
    private String seatClass;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "traveler_id", nullable = false)
    private Integer travelerId;

    @Column(name = "traveler_name", nullable = false, length = 255)
    private String travelerName;

    @Column(name = "price_per_seat", nullable = false)
    private Long pricePerSeat;

    @Column(name = "total_price", nullable = false)
    private Long totalPrice;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private QuoteStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public enum QuoteStatus {
        CREATED
    }
}

// Made with Bob
