package com.avyukt.marketsuite.common.secret;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.secret")
public class SecretProperties {

    /** 32-byte key for AES-256 (hex or raw string used as seed). */
    private String localKey;

    public String getLocalKey() {
        return localKey;
    }

    public void setLocalKey(String localKey) {
        this.localKey = localKey;
    }
}
