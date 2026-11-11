package com.galaxium.holdservice.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "holds")
public class Hold {

    @Id
    @Column(name = "hold_id", nullable = false, length = 50)
    private String holdId;

    @Column(name = "quote_id", nullable = false, length = 50)
    private String quoteId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private HoldStatus status;

    @Column(name = "reserved_until", nullable = false)
    private Instant reservedUntil;

    @Column(name = "external_booking_reference", length = 255)
    private String externalBookingReference;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Hold() {
    }

    public Hold(String holdId, String quoteId, HoldStatus status, Instant reservedUntil, String externalBookingReference, String errorMessage, Instant createdAt, Instant updatedAt) {
        this.holdId = holdId;
        this.quoteId = quoteId;
        this.status = status;
        this.reservedUntil = reservedUntil;
        this.externalBookingReference = externalBookingReference;
        this.errorMessage = errorMessage;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getHoldId() {
        return holdId;
    }

    public void setHoldId(String holdId) {
        this.holdId = holdId;
    }

    public String getQuoteId() {
        return quoteId;
    }

    public void setQuoteId(String quoteId) {
        this.quoteId = quoteId;
    }

    public HoldStatus getStatus() {
        return status;
    }

    public void setStatus(HoldStatus status) {
        this.status = status;
    }

    public Instant getReservedUntil() {
        return reservedUntil;
    }

    public void setReservedUntil(Instant reservedUntil) {
        this.reservedUntil = reservedUntil;
    }

    public String getExternalBookingReference() {
        return externalBookingReference;
    }

    public void setExternalBookingReference(String externalBookingReference) {
        this.externalBookingReference = externalBookingReference;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Hold other)) {
            return false;
        }
        return Objects.equals(holdId, other.holdId) &&
                Objects.equals(quoteId, other.quoteId) &&
                Objects.equals(status, other.status) &&
                Objects.equals(reservedUntil, other.reservedUntil) &&
                Objects.equals(externalBookingReference, other.externalBookingReference) &&
                Objects.equals(errorMessage, other.errorMessage) &&
                Objects.equals(createdAt, other.createdAt) &&
                Objects.equals(updatedAt, other.updatedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(holdId, quoteId, status, reservedUntil, externalBookingReference, errorMessage, createdAt, updatedAt);
    }

    @Override
    public String toString() {
        return "Hold(holdId=" + holdId +
                ", quoteId=" + quoteId +
                ", status=" + status +
                ", reservedUntil=" + reservedUntil +
                ", externalBookingReference=" + externalBookingReference +
                ", errorMessage=" + errorMessage +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                ")";
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public enum HoldStatus {
        HELD,
        EXPIRED,
        CONFIRMED,
        RELEASED,
        CONFIRMATION_FAILED
    }

    public static class Builder {

        private String holdId;
        private String quoteId;
        private HoldStatus status;
        private Instant reservedUntil;
        private String externalBookingReference;
        private String errorMessage;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder holdId(String holdId) {
            this.holdId = holdId;
            return this;
        }

        public Builder quoteId(String quoteId) {
            this.quoteId = quoteId;
            return this;
        }

        public Builder status(HoldStatus status) {
            this.status = status;
            return this;
        }

        public Builder reservedUntil(Instant reservedUntil) {
            this.reservedUntil = reservedUntil;
            return this;
        }

        public Builder externalBookingReference(String externalBookingReference) {
            this.externalBookingReference = externalBookingReference;
            return this;
        }

        public Builder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            return this;
        }

        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(Instant updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public Hold build() {
            return new Hold(holdId, quoteId, status, reservedUntil, externalBookingReference, errorMessage, createdAt, updatedAt);
        }
    }
}

// Made with Bob
