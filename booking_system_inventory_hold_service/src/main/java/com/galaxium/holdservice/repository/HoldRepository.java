package com.galaxium.holdservice.repository;

import com.galaxium.holdservice.domain.Hold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface HoldRepository extends JpaRepository<Hold, String> {

    @Query("SELECT h FROM Hold h WHERE h.status = 'HELD' AND h.reservedUntil < :now")
    List<Hold> findExpiredHolds(@Param("now") Date now);
}

// Made with Bob
