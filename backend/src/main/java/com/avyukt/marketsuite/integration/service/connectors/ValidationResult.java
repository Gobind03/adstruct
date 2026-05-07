package com.avyukt.marketsuite.integration.service.connectors;

public record ValidationResult(boolean valid, String message) {

    public static ValidationResult success() {
        return new ValidationResult(true, "Connection validated successfully");
    }

    public static ValidationResult failure(String message) {
        return new ValidationResult(false, message);
    }
}
