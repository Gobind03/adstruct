package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.DisclaimerLocalization;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisclaimerLocalizationRepository extends JpaRepository<DisclaimerLocalization, UUID> {

    List<DisclaimerLocalization> findByDisclaimerIdOrderByLanguage(UUID disclaimerId);

    Optional<DisclaimerLocalization> findByDisclaimerIdAndLanguage(UUID disclaimerId, String language);
}
