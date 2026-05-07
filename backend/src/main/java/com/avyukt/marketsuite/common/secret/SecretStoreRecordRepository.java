package com.avyukt.marketsuite.common.secret;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SecretStoreRecordRepository extends JpaRepository<SecretStoreRecord, UUID> {

    Optional<SecretStoreRecord> findByRef(String ref);

    void deleteByRef(String ref);
}
