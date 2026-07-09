package com.galaxium.holdservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifies that the Spring application context loads successfully with the
 * full set of beans declared by {@link HoldServiceApplication}.
 *
 * <p>The test datasource is overridden via
 * {@code src/test/resources/application.properties} to use an in-memory H2
 * database so no SQLite file is required at test time.
 */
@SpringBootTest
class HoldServiceApplicationTest {

    /**
     * Context-loads test: if any bean wiring is broken this test fails with a
     * descriptive Spring context-load exception, making the problem easy to
     * diagnose.
     */
    @Test
    void contextLoads() {
        // No assertions needed — a successful Spring context startup is the
        // assertion.  If wiring fails, Spring throws before this body runs.
    }

    /**
     * Smoke-tests the {@code main()} entry point.  Passes an empty args array
     * and expects no exception.  The context started here uses the same
     * test-scoped {@code application.properties} as the {@code @SpringBootTest}
     * above, so the in-memory H2 database is used and the call completes
     * quickly.
     */
    @Test
    void mainMethodStartsWithoutException() {
        HoldServiceApplication.main(new String[]{});
    }
}
