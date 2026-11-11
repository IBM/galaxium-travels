package com.galaxium.holdservice.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;
import java.util.Objects;

@Entity
@Table(name = "audit_events")
public class AuditEvent {

    @Id
    @UuidGenerator
    @Column(name = "event_id", length = 36)
    private String eventId;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", nullable = false, length = 50)
    private String entityId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public AuditEvent() {
    }

    public AuditEvent(String eventId, String entityType, String entityId, String eventType, String details, Instant createdAt) {
        this.eventId = eventId;
        this.entityType = entityType;
        this.entityId = entityId;
        this.eventType = eventType;
        this.details = details;
        this.createdAt = createdAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
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
        if (!(o instanceof AuditEvent other)) {
            return false;
        }
        return Objects.equals(eventId, other.eventId) &&
                Objects.equals(entityType, other.entityType) &&
                Objects.equals(entityId, other.entityId) &&
                Objects.equals(eventType, other.eventType) &&
                Objects.equals(details, other.details) &&
                Objects.equals(createdAt, other.createdAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(eventId, entityType, entityId, eventType, details, createdAt);
    }

    @Override
    public String toString() {
        return "AuditEvent(eventId=" + eventId +
                ", entityType=" + entityType +
                ", entityId=" + entityId +
                ", eventType=" + eventType +
                ", details=" + details +
                ", createdAt=" + createdAt +
                ")";
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public static class Builder {

        private String eventId;
        private String entityType;
        private String entityId;
        private String eventType;
        private String details;
        private Instant createdAt;

        public Builder eventId(String eventId) {
            this.eventId = eventId;
            return this;
        }

        public Builder entityType(String entityType) {
            this.entityType = entityType;
            return this;
        }

        public Builder entityId(String entityId) {
            this.entityId = entityId;
            return this;
        }

        public Builder eventType(String eventType) {
            this.eventType = eventType;
            return this;
        }

        public Builder details(String details) {
            this.details = details;
            return this;
        }

        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public AuditEvent build() {
            return new AuditEvent(eventId, entityType, entityId, eventType, details, createdAt);
        }
    }
}

// Made with Bob
