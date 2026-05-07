package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.research.api.dto.IngestResponse;
import com.avyukt.marketsuite.research.domain.JobType;
import com.avyukt.marketsuite.research.domain.ResearchJob;
import com.avyukt.marketsuite.research.domain.ResearchSource;
import com.avyukt.marketsuite.research.domain.SnapshotType;
import com.avyukt.marketsuite.research.domain.SourceSnapshot;
import com.avyukt.marketsuite.research.domain.SourceType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ManualUrlConnector {

    private final ResearchSourceService researchSourceService;
    private final SnapshotService snapshotService;
    private final ResearchJobService researchJobService;
    private final ObjectMapper objectMapper;

    public ManualUrlConnector(
            ResearchSourceService researchSourceService,
            SnapshotService snapshotService,
            ResearchJobService researchJobService,
            ObjectMapper objectMapper) {
        this.researchSourceService = researchSourceService;
        this.snapshotService = snapshotService;
        this.researchJobService = researchJobService;
        this.objectMapper = objectMapper;
    }

    public IngestResponse ingest(IngestRequest request) {
        String metaJson = toMetaJson(request.metaJson());
        ResearchSource source = researchSourceService.create(
                request.workspaceId(),
                SourceType.URL,
                request.title(),
                request.urlOrFileUrl(),
                request.competitorId(),
                null,
                null,
                null,
                null,
                metaJson);
        SnapshotType snapshotType = parseSnapshotType(request.snapshotType());
        String rawJson = "{}";
        String tagsJson = "[]";
        SourceSnapshot snapshot = snapshotService.create(
                request.workspaceId(),
                source.getId(),
                snapshotType,
                request.title(),
                request.summaryText(),
                request.rawText(),
                rawJson,
                null,
                tagsJson);
        Map<String, Object> jobInput = new HashMap<>();
        jobInput.put("sourceId", source.getId().toString());
        jobInput.put("snapshotId", snapshot.getId().toString());
        String inputJson;
        try {
            inputJson = objectMapper.writeValueAsString(jobInput);
        } catch (Exception e) {
            inputJson = "{}";
        }
        ResearchJob job = researchJobService.createJob(request.workspaceId(), JobType.SNAPSHOT_IMPORT, inputJson);
        return new IngestResponse(source.getId(), snapshot.getId(), job.getId());
    }

    private String toMetaJson(Map<String, Object> meta) {
        if (meta == null || meta.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(meta);
        } catch (Exception e) {
            return "{}";
        }
    }

    private SnapshotType parseSnapshotType(String s) {
        if (s == null || s.isBlank()) {
            return SnapshotType.WEB_PAGE;
        }
        try {
            return SnapshotType.valueOf(s);
        } catch (IllegalArgumentException e) {
            return SnapshotType.CUSTOM;
        }
    }
}
