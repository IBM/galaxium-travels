package com.galaxium.holdservice.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "holds")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
}

// Made with Bob
