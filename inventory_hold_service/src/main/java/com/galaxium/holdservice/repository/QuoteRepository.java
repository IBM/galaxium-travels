package com.galaxium.holdservice.repository;

import com.galaxium.holdservice.domain.Quote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuoteRepository extends JpaRepository<Quote, String> {
}

// Made with Bob
