package com.galaxium.holdservice.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Objects;

public class CreateQuoteRequest {

    @NotNull(message = "Flight ID is required")
    private Integer flightId;

    @NotBlank(message = "Seat class is required")
    private String seatClass;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @NotNull(message = "Traveler ID is required")
    private Integer travelerId;

    @NotBlank(message = "Traveler name is required")
    private String travelerName;

    public CreateQuoteRequest() {
    }

    public CreateQuoteRequest(Integer flightId, String seatClass, Integer quantity, Integer travelerId, String travelerName) {
        this.flightId = flightId;
        this.seatClass = seatClass;
        this.quantity = quantity;
        this.travelerId = travelerId;
        this.travelerName = travelerName;
    }

    public static Builder builder() {
        return new Builder();
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

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof CreateQuoteRequest other)) {
            return false;
        }
        return Objects.equals(flightId, other.flightId) &&
                Objects.equals(seatClass, other.seatClass) &&
                Objects.equals(quantity, other.quantity) &&
                Objects.equals(travelerId, other.travelerId) &&
                Objects.equals(travelerName, other.travelerName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(flightId, seatClass, quantity, travelerId, travelerName);
    }

    @Override
    public String toString() {
        return "CreateQuoteRequest(flightId=" + flightId +
                ", seatClass=" + seatClass +
                ", quantity=" + quantity +
                ", travelerId=" + travelerId +
                ", travelerName=" + travelerName +
                ")";
    }

    public static class Builder {

        private Integer flightId;
        private String seatClass;
        private Integer quantity;
        private Integer travelerId;
        private String travelerName;

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

        public CreateQuoteRequest build() {
            return new CreateQuoteRequest(flightId, seatClass, quantity, travelerId, travelerName);
        }
    }
}

// Made with Bob
