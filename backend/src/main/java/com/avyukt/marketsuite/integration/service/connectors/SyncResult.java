package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.SyncStatus;

public record SyncResult(SyncStatus status, int fetched, int upserted, int errors, String errorMessage) {

    public static SyncResult success(int fetched, int upserted) {
        return new SyncResult(SyncStatus.SUCCESS, fetched, upserted, 0, null);
    }

    public static SyncResult failed(String errorMessage) {
        return new SyncResult(SyncStatus.FAILED, 0, 0, 1, errorMessage);
    }
}
