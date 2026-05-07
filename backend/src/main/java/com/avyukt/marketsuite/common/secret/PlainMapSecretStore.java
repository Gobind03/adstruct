package com.avyukt.marketsuite.common.secret;

import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Non-dev fallback: in-memory plain storage. Replace with a cloud secret manager in production.
 */
@Component
@Profile("!dev")
public class PlainMapSecretStore implements SecretStore {

    private final ConcurrentHashMap<String, String> store = new ConcurrentHashMap<>();

    @Override
    public void store(String key, String value) {
        store.put(key, value);
    }

    @Override
    public String retrieve(String key) {
        return store.get(key);
    }

    @Override
    public void delete(String key) {
        store.remove(key);
    }
}
