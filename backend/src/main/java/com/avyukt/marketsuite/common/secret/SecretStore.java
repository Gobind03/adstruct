package com.avyukt.marketsuite.common.secret;

public interface SecretStore {

    void store(String key, String value);

    String retrieve(String key);

    void delete(String key);
}
