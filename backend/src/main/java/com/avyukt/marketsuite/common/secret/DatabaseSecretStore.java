package com.avyukt.marketsuite.common.secret;

import java.nio.ByteBuffer;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Primary
public class DatabaseSecretStore implements SecretStore {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSecretStore.class);
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    private final SecretStoreRecordRepository repository;
    private final SecretKeySpec keySpec;

    public DatabaseSecretStore(
            SecretStoreRecordRepository repository, @Value("${app.encryption.key}") String encryptionKey) {
        this.repository = repository;
        byte[] keyBytes = encryptionKey.getBytes();
        byte[] key = new byte[16];
        System.arraycopy(keyBytes, 0, key, 0, Math.min(keyBytes.length, 16));
        this.keySpec = new SecretKeySpec(key, "AES");
    }

    @Override
    @Transactional
    public void store(String key, String value) {
        byte[] encrypted = encrypt(value);
        var existing = repository.findByRef(key);
        if (existing.isPresent()) {
            existing.get().setEncryptedPayload(encrypted);
            repository.save(existing.get());
        } else {
            repository.save(
                    SecretStoreRecord.builder().ref(key).encryptedPayload(encrypted).build());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public String retrieve(String key) {
        return repository.findByRef(key).map(r -> decrypt(r.getEncryptedPayload())).orElse(null);
    }

    @Override
    @Transactional
    public void delete(String key) {
        repository.deleteByRef(key);
    }

    private byte[] encrypt(String value) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes());
            return ByteBuffer.allocate(IV_LENGTH + encrypted.length)
                    .put(iv)
                    .put(encrypted)
                    .array();
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt secret", e);
        }
    }

    private String decrypt(byte[] combined) {
        try {
            ByteBuffer buffer = ByteBuffer.wrap(combined);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(encrypted));
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt secret", e);
        }
    }
}
