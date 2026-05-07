package com.avyukt.marketsuite.governance.api;

import com.avyukt.marketsuite.governance.api.dto.*;
import com.avyukt.marketsuite.governance.domain.BrandStatus;
import com.avyukt.marketsuite.governance.service.DisclaimerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orgs/{orgId}/disclaimers")
@Tag(name = "Disclaimers")
@SecurityRequirement(name = "bearerAuth")
public class DisclaimersController {

    private final DisclaimerService service;

    public DisclaimersController(DisclaimerService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List disclaimers")
    public ResponseEntity<List<DisclaimerResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) String status) {
        BrandStatus s = status != null ? BrandStatus.valueOf(status) : null;
        return ResponseEntity.ok(service.list(orgId, workspaceId, s));
    }

    @PostMapping
    @Operation(summary = "Create disclaimer")
    public ResponseEntity<DisclaimerResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody DisclaimerCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(orgId, request));
    }

    @PatchMapping("/{disclaimerId}")
    @Operation(summary = "Patch disclaimer")
    public ResponseEntity<DisclaimerResponse> patch(
            @PathVariable UUID orgId,
            @PathVariable UUID disclaimerId,
            @Valid @RequestBody DisclaimerPatchRequest request) {
        return ResponseEntity.ok(service.patch(orgId, disclaimerId, request));
    }

    @GetMapping("/{disclaimerId}/localizations")
    @Operation(summary = "List disclaimer localizations")
    public ResponseEntity<List<DisclaimerLocalizationResponse>> listLocalizations(
            @PathVariable UUID orgId, @PathVariable UUID disclaimerId) {
        return ResponseEntity.ok(service.listLocalizations(disclaimerId));
    }

    @PostMapping("/{disclaimerId}/localizations")
    @Operation(summary = "Add disclaimer localization")
    public ResponseEntity<DisclaimerLocalizationResponse> createLocalization(
            @PathVariable UUID orgId,
            @PathVariable UUID disclaimerId,
            @Valid @RequestBody DisclaimerLocalizationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createLocalization(orgId, disclaimerId, request));
    }

    @PatchMapping("/{disclaimerId}/localizations/{locId}")
    @Operation(summary = "Patch disclaimer localization")
    public ResponseEntity<DisclaimerLocalizationResponse> patchLocalization(
            @PathVariable UUID orgId,
            @PathVariable UUID disclaimerId,
            @PathVariable UUID locId,
            @Valid @RequestBody DisclaimerLocalizationRequest request) {
        return ResponseEntity.ok(service.patchLocalization(orgId, locId, request));
    }
}
