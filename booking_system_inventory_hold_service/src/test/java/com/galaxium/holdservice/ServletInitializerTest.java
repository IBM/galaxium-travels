package com.galaxium.holdservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link ServletInitializer}.
 *
 * <p>{@code ServletInitializer} is the WAR deployment hook that tells the
 * embedded servlet container which Spring Boot application class to load.
 * These tests verify that:
 * <ul>
 *   <li>{@code configure()} delegates correctly to the builder and returns the
 *       same {@link SpringApplicationBuilder} instance, and</li>
 *   <li>the class can be instantiated without error (no-arg constructor is
 *       required by the Servlet 3 spec for programmatic initializers).</li>
 * </ul>
 *
 * <p>No Spring context is started — this is a pure unit test.
 */
class ServletInitializerTest {

    /**
     * Verifies that {@link ServletInitializer} can be instantiated via its
     * implicit no-arg constructor without throwing an exception.
     */
    @Test
    void canBeInstantiated() {
        new ServletInitializer();
    }

    /**
     * Verifies that {@link ServletInitializer#configure} returns the
     * {@link SpringApplicationBuilder} passed in (not {@code null}, not a new
     * instance), confirming the method completes without error and honours the
     * contract of {@code SpringBootServletInitializer#configure}.
     */
    @Test
    void configureReturnsSameBuilderInstance() {
        ServletInitializer initializer = new ServletInitializer();
        SpringApplicationBuilder builder = new SpringApplicationBuilder();

        SpringApplicationBuilder result = initializer.configure(builder);

        assertThat(result).isSameAs(builder);
    }
}
