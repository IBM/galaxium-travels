package com.galaxium.holdservice.api.dto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.validation.ConstraintViolation;
import javax.validation.Validation;
import javax.validation.Validator;
import javax.validation.ValidatorFactory;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class CreateQuoteRequestTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    private CreateQuoteRequest validRequest() {
        CreateQuoteRequest req = new CreateQuoteRequest();
        req.setFlightId(42);
        req.setSeatClass("economy");
        req.setQuantity(2);
        req.setTravelerId(7);
        req.setTravelerName("Alice Smith");
        return req;
    }

    private Set<String> violationMessages(CreateQuoteRequest req) {
        return validator.validate(req).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }

    private Set<String> violationFields(CreateQuoteRequest req) {
        return validator.validate(req).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    // -----------------------------------------------------------------------
    // Valid request — no violations
    // -----------------------------------------------------------------------

    @Test
    void shouldPassValidation_whenAllFieldsAreValid() {
        CreateQuoteRequest req = validRequest();

        Set<ConstraintViolation<CreateQuoteRequest>> violations = validator.validate(req);

        assertThat(violations).isEmpty();
    }

    // -----------------------------------------------------------------------
    // flightId — @NotNull
    // -----------------------------------------------------------------------

    @Test
    void shouldFailValidation_whenFlightIdIsNull() {
        CreateQuoteRequest req = validRequest();
        req.setFlightId(null);

        assertThat(violationFields(req)).contains("flightId");
        assertThat(violationMessages(req)).contains("Flight ID is required");
    }

    // -----------------------------------------------------------------------
    // seatClass — @NotBlank
    // -----------------------------------------------------------------------

    @Test
    void shouldFailValidation_whenSeatClassIsNull() {
        CreateQuoteRequest req = validRequest();
        req.setSeatClass(null);

        assertThat(violationFields(req)).contains("seatClass");
        assertThat(violationMessages(req)).contains("Seat class is required");
    }

    @Test
    void shouldFailValidation_whenSeatClassIsEmpty() {
        CreateQuoteRequest req = validRequest();
        req.setSeatClass("");

        assertThat(violationFields(req)).contains("seatClass");
        assertThat(violationMessages(req)).contains("Seat class is required");
    }

    @Test
    void shouldFailValidation_whenSeatClassIsBlank() {
        CreateQuoteRequest req = validRequest();
        req.setSeatClass("   ");

        assertThat(violationFields(req)).contains("seatClass");
        assertThat(violationMessages(req)).contains("Seat class is required");
    }

    // -----------------------------------------------------------------------
    // quantity — @NotNull and @Min(1)
    // -----------------------------------------------------------------------

    @Test
    void shouldFailValidation_whenQuantityIsNull() {
        CreateQuoteRequest req = validRequest();
        req.setQuantity(null);

        assertThat(violationFields(req)).contains("quantity");
        assertThat(violationMessages(req)).contains("Quantity is required");
    }

    @Test
    void shouldFailValidation_whenQuantityIsZero() {
        CreateQuoteRequest req = validRequest();
        req.setQuantity(0);

        assertThat(violationFields(req)).contains("quantity");
        assertThat(violationMessages(req)).contains("Quantity must be at least 1");
    }

    @Test
    void shouldFailValidation_whenQuantityIsNegative() {
        CreateQuoteRequest req = validRequest();
        req.setQuantity(-1);

        assertThat(violationFields(req)).contains("quantity");
        assertThat(violationMessages(req)).contains("Quantity must be at least 1");
    }

    @Test
    void shouldPassValidation_whenQuantityIsOne() {
        CreateQuoteRequest req = validRequest();
        req.setQuantity(1);

        assertThat(validator.validate(req)).isEmpty();
    }

    // -----------------------------------------------------------------------
    // travelerId — @NotNull
    // -----------------------------------------------------------------------

    @Test
    void shouldFailValidation_whenTravelerIdIsNull() {
        CreateQuoteRequest req = validRequest();
        req.setTravelerId(null);

        assertThat(violationFields(req)).contains("travelerId");
        assertThat(violationMessages(req)).contains("Traveler ID is required");
    }

    // -----------------------------------------------------------------------
    // travelerName — @NotBlank
    // -----------------------------------------------------------------------

    @Test
    void shouldFailValidation_whenTravelerNameIsNull() {
        CreateQuoteRequest req = validRequest();
        req.setTravelerName(null);

        assertThat(violationFields(req)).contains("travelerName");
        assertThat(violationMessages(req)).contains("Traveler name is required");
    }

    @Test
    void shouldFailValidation_whenTravelerNameIsEmpty() {
        CreateQuoteRequest req = validRequest();
        req.setTravelerName("");

        assertThat(violationFields(req)).contains("travelerName");
        assertThat(violationMessages(req)).contains("Traveler name is required");
    }

    @Test
    void shouldFailValidation_whenTravelerNameIsBlank() {
        CreateQuoteRequest req = validRequest();
        req.setTravelerName("   ");

        assertThat(violationFields(req)).contains("travelerName");
        assertThat(violationMessages(req)).contains("Traveler name is required");
    }

    // -----------------------------------------------------------------------
    // Multiple violations at once
    // -----------------------------------------------------------------------

    @Test
    void shouldReportMultipleViolations_whenSeveralFieldsAreInvalid() {
        CreateQuoteRequest req = new CreateQuoteRequest();
        // all fields left null / default

        Set<String> fields = violationFields(req);

        assertThat(fields).containsExactlyInAnyOrder(
                "flightId", "seatClass", "quantity", "travelerId", "travelerName");
    }

    // -----------------------------------------------------------------------
    // Getters and setters round-trip
    // -----------------------------------------------------------------------

    @Test
    void shouldReturnValuesSetBySetters() {
        CreateQuoteRequest req = new CreateQuoteRequest();
        req.setFlightId(10);
        req.setSeatClass("business");
        req.setQuantity(3);
        req.setTravelerId(99);
        req.setTravelerName("Bob Jones");

        assertThat(req.getFlightId()).isEqualTo(10);
        assertThat(req.getSeatClass()).isEqualTo("business");
        assertThat(req.getQuantity()).isEqualTo(3);
        assertThat(req.getTravelerId()).isEqualTo(99);
        assertThat(req.getTravelerName()).isEqualTo("Bob Jones");
    }

    @Test
    void shouldReturnNullForUninitializedFields() {
        CreateQuoteRequest req = new CreateQuoteRequest();

        assertThat(req.getFlightId()).isNull();
        assertThat(req.getSeatClass()).isNull();
        assertThat(req.getQuantity()).isNull();
        assertThat(req.getTravelerId()).isNull();
        assertThat(req.getTravelerName()).isNull();
    }
}
