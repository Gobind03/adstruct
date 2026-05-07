package com.avyukt.marketsuite.integration.service.connectors;

public class PlatformApiException extends RuntimeException {

    public PlatformApiException(String message) {
        super(message);
    }

    public PlatformApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
