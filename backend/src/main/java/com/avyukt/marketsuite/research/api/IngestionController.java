package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.IngestFileRequest;
import com.avyukt.marketsuite.research.api.dto.IngestResponse;
import com.avyukt.marketsuite.research.api.dto.IngestUrlRequest;
import com.avyukt.marketsuite.research.service.IngestRequest;
import com.avyukt.marketsuite.research.service.ManualFileConnector;
import com.avyukt.marketsuite.research.service.ManualUrlConnector;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/ingest")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class IngestionController {

    private final ManualUrlConnector manualUrlConnector;
    private final ManualFileConnector manualFileConnector;

    public IngestionController(ManualUrlConnector manualUrlConnector, ManualFileConnector manualFileConnector) {
        this.manualUrlConnector = manualUrlConnector;
        this.manualFileConnector = manualFileConnector;
    }

    @PostMapping("/url")
    @Operation(summary = "Ingest content from URL")
    public ResponseEntity<IngestResponse> ingestUrl(
            @PathVariable UUID workspaceId, @Valid @RequestBody IngestUrlRequest body) {
        IngestRequest request =
                new IngestRequest(
                        workspaceId,
                        body.title(),
                        body.url(),
                        body.snapshotType(),
                        body.competitorId(),
                        body.rawText(),
                        body.summaryText(),
                        body.metaJson(),
                        false);
        IngestResponse response = manualUrlConnector.ingest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/file")
    @Operation(summary = "Ingest content from file")
    public ResponseEntity<IngestResponse> ingestFile(
            @PathVariable UUID workspaceId, @Valid @RequestBody IngestFileRequest body) {
        IngestRequest request =
                new IngestRequest(
                        workspaceId,
                        body.title(),
                        body.fileUrl(),
                        body.snapshotType(),
                        body.competitorId(),
                        null,
                        body.summaryText(),
                        body.metaJson(),
                        true);
        IngestResponse response = manualFileConnector.ingest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
