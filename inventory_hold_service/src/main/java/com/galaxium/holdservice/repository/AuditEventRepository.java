package com.galaxium.holdservice.repository;

import com.galaxium.holdservice.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, String> {
}

// Made with Bob
