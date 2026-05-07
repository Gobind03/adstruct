package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.IntegrationAccount;
import com.avyukt.marketsuite.integration.domain.IntegrationStatus;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface IntegrationAccountRepository extends JpaRepository<IntegrationAccount, UUID> {

    List<IntegrationAccount> findByOrgId(UUID orgId);

    List<IntegrationAccount> findByOrgIdAndPlatformType(UUID orgId, PlatformType platformType);

    List<IntegrationAccount> findByOrgIdAndStatus(UUID orgId, IntegrationStatus status);

    @Query(
            "SELECT ia FROM IntegrationAccount ia LEFT JOIN FETCH ia.provider p LEFT JOIN FETCH ia.org LEFT JOIN FETCH ia.connectedByUser WHERE ia.org.id = :orgId"
                    + " AND (:platformType IS NULL OR ia.platformType = :platformType)"
                    + " AND (:status IS NULL OR ia.status = :status)"
                    + " AND (:category IS NULL OR p.category = :category)")
    List<IntegrationAccount> findFiltered(
            UUID orgId,
            PlatformType platformType,
            IntegrationStatus status,
            com.avyukt.marketsuite.integration.domain.IntegrationCategory category);

    @Query(
            "SELECT ia FROM IntegrationAccount ia LEFT JOIN FETCH ia.provider LEFT JOIN FETCH ia.org LEFT JOIN FETCH ia.connectedByUser WHERE ia.id = :id")
    java.util.Optional<IntegrationAccount> findByIdEager(UUID id);

    List<IntegrationAccount> findByOrgIdAndPlatformTypeInAndStatus(
            UUID orgId, List<PlatformType> platformTypes, IntegrationStatus status);
}
