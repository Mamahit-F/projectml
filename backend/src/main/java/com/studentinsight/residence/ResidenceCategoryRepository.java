package com.studentinsight.residence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResidenceCategoryRepository extends JpaRepository<ResidenceCategory, Long> {
    Optional<ResidenceCategory> findByCode(String code);
}
