package com.galaxium.holdservice.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
}

// Made with Bob
