package com.avyukt.marketsuite.measurement.api;

import com.avyukt.marketsuite.measurement.api.dto.AdEventRequest;
import com.avyukt.marketsuite.measurement.api.dto.AdEventResponse;
import com.avyukt.marketsuite.measurement.api.dto.EventSummaryResponse;
import com.avyukt.marketsuite.measurement.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
@Tag(name = "Events")
@SecurityRequirement(name = "bearerAuth")
public class EventsController {

    private final EventService service;

    public EventsController(EventService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "Ingest ad event")
    public ResponseEntity<AdEventResponse> ingest(@Valid @RequestBody AdEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.ingest(request));
    }

    @GetMapping("/summary")
    @Operation(summary = "Get event summary")
    public ResponseEntity<List<EventSummaryResponse>> summary(
            @RequestParam UUID workspaceId,
            @RequestParam(required = false) UUID campaignId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {
        return ResponseEntity.ok(service.getSummary(workspaceId, campaignId, from, to));
    }
}
