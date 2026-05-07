package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.BrandRule;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandRuleRepository extends JpaRepository<BrandRule, UUID> {

    List<BrandRule> findByRuleSetIdOrderByCreatedAtDesc(UUID ruleSetId);
}
