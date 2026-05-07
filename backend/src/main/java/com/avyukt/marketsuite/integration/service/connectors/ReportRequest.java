package com.avyukt.marketsuite.integration.service.connectors;

import java.time.LocalDate;

public record ReportRequest(LocalDate startDate, LocalDate endDate, String granularity, String adAccountId) {

    public ReportRequest {
        if (granularity == null) granularity = "DAY";
    }
}
