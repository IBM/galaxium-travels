package com.galaxium.holdservice.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "quotes")
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

    public Quote() {
    }

    public Quote(String quoteId, Integer flightId, String seatClass, Integer quantity, Integer travelerId, String travelerName, Long pricePerSeat, Long totalPrice, Instant expiresAt, QuoteStatus status, Instant createdAt) {
        this.quoteId = quoteId;
        this.flightId = flightId;
        this.seatClass = seatClass;
        this.quantity = quantity;
        this.travelerId = travelerId;
        this.travelerName = travelerName;
        this.pricePerSeat = pricePerSeat;
        this.totalPrice = totalPrice;
        this.expiresAt = expiresAt;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getQuoteId() {
        return quoteId;
    }

    public void setQuoteId(String quoteId) {
        this.quoteId = quoteId;
    }

    public Integer getFlightId() {
        return flightId;
    }

    public void setFlightId(Integer flightId) {
        this.flightId = flightId;
    }

    public String getSeatClass() {
        return seatClass;
    }

    public void setSeatClass(String seatClass) {
        this.seatClass = seatClass;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getTravelerId() {
        return travelerId;
    }

    public void setTravelerId(Integer travelerId) {
        this.travelerId = travelerId;
    }

    public String getTravelerName() {
        return travelerName;
    }

    public void setTravelerName(String travelerName) {
        this.travelerName = travelerName;
    }

    public Long getPricePerSeat() {
        return pricePerSeat;
    }

    public void setPricePerSeat(Long pricePerSeat) {
        this.pricePerSeat = pricePerSeat;
    }

    public Long getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(Long totalPrice) {
        this.totalPrice = totalPrice;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public QuoteStatus getStatus() {
        return status;
    }

    public void setStatus(QuoteStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Quote other)) {
            return false;
        }
        return Objects.equals(quoteId, other.quoteId) &&
                Objects.equals(flightId, other.flightId) &&
                Objects.equals(seatClass, other.seatClass) &&
                Objects.equals(quantity, other.quantity) &&
                Objects.equals(travelerId, other.travelerId) &&
                Objects.equals(travelerName, other.travelerName) &&
                Objects.equals(pricePerSeat, other.pricePerSeat) &&
                Objects.equals(totalPrice, other.totalPrice) &&
                Objects.equals(expiresAt, other.expiresAt) &&
                Objects.equals(status, other.status) &&
                Objects.equals(createdAt, other.createdAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(quoteId, flightId, seatClass, quantity, travelerId, travelerName, pricePerSeat, totalPrice, expiresAt, status, createdAt);
    }

    @Override
    public String toString() {
        return "Quote(quoteId=" + quoteId +
                ", flightId=" + flightId +
                ", seatClass=" + seatClass +
                ", quantity=" + quantity +
                ", travelerId=" + travelerId +
                ", travelerName=" + travelerName +
                ", pricePerSeat=" + pricePerSeat +
                ", totalPrice=" + totalPrice +
                ", expiresAt=" + expiresAt +
                ", status=" + status +
                ", createdAt=" + createdAt +
                ")";
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public enum QuoteStatus {
        CREATED
    }

    public static class Builder {

        private String quoteId;
        private Integer flightId;
        private String seatClass;
        private Integer quantity;
        private Integer travelerId;
        private String travelerName;
        private Long pricePerSeat;
        private Long totalPrice;
        private Instant expiresAt;
        private QuoteStatus status;
        private Instant createdAt;

        public Builder quoteId(String quoteId) {
            this.quoteId = quoteId;
            return this;
        }

        public Builder flightId(Integer flightId) {
            this.flightId = flightId;
            return this;
        }

        public Builder seatClass(String seatClass) {
            this.seatClass = seatClass;
            return this;
        }

        public Builder quantity(Integer quantity) {
            this.quantity = quantity;
            return this;
        }

        public Builder travelerId(Integer travelerId) {
            this.travelerId = travelerId;
            return this;
        }

        public Builder travelerName(String travelerName) {
            this.travelerName = travelerName;
            return this;
        }

        public Builder pricePerSeat(Long pricePerSeat) {
            this.pricePerSeat = pricePerSeat;
            return this;
        }

        public Builder totalPrice(Long totalPrice) {
            this.totalPrice = totalPrice;
            return this;
        }

        public Builder expiresAt(Instant expiresAt) {
            this.expiresAt = expiresAt;
            return this;
        }

        public Builder status(QuoteStatus status) {
            this.status = status;
            return this;
        }

        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Quote build() {
            return new Quote(quoteId, flightId, seatClass, quantity, travelerId, travelerName, pricePerSeat, totalPrice, expiresAt, status, createdAt);
        }
    }
}

// Made with Bob
