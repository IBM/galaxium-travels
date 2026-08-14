package com.galaxium.holdservice.api.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CreateQuoteRequestTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    // -------------------------------------------------------------------------
    // Helper – build a fully-valid request
    // -------------------------------------------------------------------------
    private CreateQuoteRequest validRequest() {
        return CreateQuoteRequest.builder()
                .flightId(42)
                .seatClass("economy")
                .quantity(2)
                .travelerId(7)
                .travelerName("Jane Doe")
                .build();
    }

    private Set<ConstraintViolation<CreateQuoteRequest>> validate(CreateQuoteRequest req) {
        return validator.validate(req);
    }

    // =========================================================================
    // Happy-path
    // =========================================================================

    @Test
    void testValidRequestProducesNoViolations() {
        // Arrange
        CreateQuoteRequest request = validRequest();

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).isEmpty();
    }

    // =========================================================================
    // flightId
    // =========================================================================

    @Test
    void testFlightIdNullProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setFlightId(null);

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        ConstraintViolation<CreateQuoteRequest> violation = violations.iterator().next();
        assertThat(violation.getPropertyPath().toString()).isEqualTo("flightId");
        assertThat(violation.getMessage()).isEqualTo("Flight ID is required");
    }

    // =========================================================================
    // seatClass
    // =========================================================================

    @Test
    void testSeatClassNullProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setSeatClass(null);

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("seatClass");
        assertThat(violations.iterator().next().getMessage()).isEqualTo("Seat class is required");
    }

    @Test
    void testSeatClassBlankProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setSeatClass("   ");

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("seatClass");
        assertThat(violations.iterator().next().getMessage()).isEqualTo("Seat class is required");
    }

    @Test
    void testSeatClassEmptyStringProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setSeatClass("");

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("seatClass");
    }

    // =========================================================================
    // quantity
    // =========================================================================

    @Test
    void testQuantityNullProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setQuantity(null);

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("quantity");
        assertThat(violations.iterator().next().getMessage()).isEqualTo("Quantity is required");
    }

    @Test
    void testQuantityZeroProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setQuantity(0);

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("quantity");
        assertThat(violations.iterator().next().getMessage()).isEqualTo("Quantity must be at least 1");
    }

    @Test
    void testQuantityNegativeProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setQuantity(-5);

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("quantity");
        assertThat(violations.iterator().next().getMessage()).isEqualTo("Quantity must be at least 1");
    }

    @Test
    void testQuantityOneProducesNoViolations() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setQuantity(1);

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).isEmpty();
    }

    // =========================================================================
    // travelerId
    // =========================================================================

    @Test
    void testTravelerIdNullProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setTravelerId(null);

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("travelerId");
        assertThat(violations.iterator().next().getMessage()).isEqualTo("Traveler ID is required");
    }

    // =========================================================================
    // travelerName
    // =========================================================================

    @Test
    void testTravelerNameNullProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setTravelerName(null);

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("travelerName");
        assertThat(violations.iterator().next().getMessage()).isEqualTo("Traveler name is required");
    }

    @Test
    void testTravelerNameBlankProducesViolation() {
        // Arrange
        CreateQuoteRequest request = validRequest();
        request.setTravelerName("   ");

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("travelerName");
        assertThat(violations.iterator().next().getMessage()).isEqualTo("Traveler name is required");
    }

    // =========================================================================
    // Multiple violations at once
    // =========================================================================

    @Test
    void testAllFieldsMissingProducesOneViolationPerField() {
        // Arrange – use no-arg constructor to get all nulls
        CreateQuoteRequest request = new CreateQuoteRequest();

        // Act
        Set<ConstraintViolation<CreateQuoteRequest>> violations = validate(request);

        // Assert – each of the 5 fields carries at least one violation
        assertThat(violations).hasSize(5);
    }
}
