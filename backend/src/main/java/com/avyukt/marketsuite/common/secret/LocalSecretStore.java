package com.avyukt.marketsuite.common.secret;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.context.annotation.Profile;

import java.util.concurrent.ConcurrentHashMap;

@Component
@Profile("dev")
public class LocalSecretStore implements SecretStore {

    private static final Logger log = LoggerFactory.getLogger(LocalSecretStore.class);
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    private final ConcurrentHashMap<String, String> store = new ConcurrentHashMap<>();
    private final SecretKeySpec keySpec;

    public LocalSecretStore(@Value("${app.encryption.key}") String encryptionKey) {
        byte[] keyBytes = encryptionKey.getBytes();
        byte[] key = new byte[16];
        System.arraycopy(keyBytes, 0, key, 0, Math.min(keyBytes.length, 16));
        this.keySpec = new SecretKeySpec(key, "AES");
    }

    @Override
    public void store(String key, String value) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes());
            byte[] combined = ByteBuffer.allocate(IV_LENGTH + encrypted.length)
                    .put(iv).put(encrypted).array();
            store.put(key, Base64.getEncoder().encodeToString(combined));
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt secret", e);
        }
    }

    @Override
    public String retrieve(String key) {
        String encoded = store.get(key);
        if (encoded == null) return null;
        try {
            byte[] combined = Base64.getDecoder().decode(encoded);
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

    @Override
    public void delete(String key) {
        store.remove(key);
    }
}
