package com.avyukt.marketsuite.research.service.connectors;

public interface ResearchConnector {

    IngestResult ingest(IngestRequest request);
}
