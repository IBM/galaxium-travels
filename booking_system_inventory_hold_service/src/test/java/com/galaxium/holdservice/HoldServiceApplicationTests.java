package com.galaxium.holdservice;

import com.galaxium.holdservice.api.HealthController;
import com.galaxium.holdservice.api.HoldController;
import com.galaxium.holdservice.api.QuoteController;
import com.galaxium.holdservice.client.PythonBackendClient;
import com.galaxium.holdservice.scheduler.HoldExpirationScheduler;
import com.galaxium.holdservice.service.HoldService;
import com.galaxium.holdservice.service.PricingService;
import com.galaxium.holdservice.service.QuoteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class HoldServiceApplicationTests {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private HoldExpirationScheduler holdExpirationScheduler;

    // ---------------------------------------------------------------------------
    // 2.13 testContextLoads — application context initializes without errors
    // ---------------------------------------------------------------------------
    @Test
    void testContextLoads() {
        assertThat(applicationContext).isNotNull();
    }

    // ---------------------------------------------------------------------------
    // 2.13 testBeansAreCreated — all required service/controller beans are present
    // ---------------------------------------------------------------------------
    @Test
    void testBeansAreCreated() {
        // Service layer
        assertThat(applicationContext.getBean(QuoteService.class)).isNotNull();
        assertThat(applicationContext.getBean(HoldService.class)).isNotNull();
        assertThat(applicationContext.getBean(PricingService.class)).isNotNull();

        // API layer
        assertThat(applicationContext.getBean(QuoteController.class)).isNotNull();
        assertThat(applicationContext.getBean(HoldController.class)).isNotNull();
        assertThat(applicationContext.getBean(HealthController.class)).isNotNull();

        // Client
        assertThat(applicationContext.getBean(PythonBackendClient.class)).isNotNull();

        // Scheduler
        assertThat(applicationContext.getBean(HoldExpirationScheduler.class)).isNotNull();
    }

    // ---------------------------------------------------------------------------
    // 2.13 testDataSourceConfigured — database connection pool is initialized
    // ---------------------------------------------------------------------------
    @Test
    void testDataSourceConfigured() throws SQLException {
        assertThat(dataSource).isNotNull();
        try (Connection connection = dataSource.getConnection()) {
            assertThat(connection).isNotNull();
            assertThat(connection.isValid(1)).isTrue();
        }
    }

    // ---------------------------------------------------------------------------
    // 2.13 testTransactionManagerConfigured — transaction support is active
    // ---------------------------------------------------------------------------
    @Test
    void testTransactionManagerConfigured() {
        assertThat(transactionManager).isNotNull();
    }

    // ---------------------------------------------------------------------------
    // 2.13 testScheduledJobsActive — scheduler bean is registered and running
    // ---------------------------------------------------------------------------
    @Test
    void testScheduledJobsActive() {
        assertThat(holdExpirationScheduler).isNotNull();
        // Verify the TaskScheduler infrastructure bean is also present,
        // confirming @EnableScheduling created the scheduling infrastructure.
        assertThat(applicationContext.containsBean("taskScheduler")
                || applicationContext.getBeansOfType(TaskScheduler.class).size() > 0)
                .isTrue();
    }
}
