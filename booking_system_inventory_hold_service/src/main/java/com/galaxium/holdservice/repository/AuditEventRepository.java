package com.galaxium.holdservice.repository;

import com.galaxium.holdservice.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, String> {

    List<AuditEvent> findTop50ByOrderByCreatedAtDesc();
}

// Made with Bob
