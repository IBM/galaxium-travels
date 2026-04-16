package com.galaxium.holdservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HoldServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(HoldServiceApplication.class, args);
    }
}

// Made with Bob
