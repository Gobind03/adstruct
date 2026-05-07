package com.avyukt.marketsuite.campaign.api;

import com.avyukt.marketsuite.campaign.api.dto.*;
import com.avyukt.marketsuite.campaign.domain.CampaignObjective;
import com.avyukt.marketsuite.campaign.domain.CampaignStatus;
import com.avyukt.marketsuite.campaign.service.CampaignService;
import com.avyukt.marketsuite.campaign.service.SponsoredUnitService;
import com.avyukt.marketsuite.campaign.service.TargetSetService;
import com.avyukt.marketsuite.common.PagedResponse;
import com.avyukt.marketsuite.integration.api.dto.CampaignReportDataResponse;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.repo.CampaignReportDataRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/campaigns")
@Tag(name = "Conversation Campaigns")
@SecurityRequirement(name = "bearerAuth")
public class ConversationCampaignsController {

    private final CampaignService campaignService;
    private final TargetSetService targetSetService;
    private final SponsoredUnitService sponsoredUnitService;
    private final CampaignReportDataRepository reportDataRepo;

    public ConversationCampaignsController(CampaignService campaignService,
                                           TargetSetService targetSetService,
                                           SponsoredUnitService sponsoredUnitService,
                                           CampaignReportDataRepository reportDataRepo) {
        this.campaignService = campaignService;
        this.targetSetService = targetSetService;
        this.sponsoredUnitService = sponsoredUnitService;
        this.reportDataRepo = reportDataRepo;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Create campaign")
    public ResponseEntity<CampaignResponse> create(@Valid @RequestBody CampaignCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.create(request));
    }

    @GetMapping
    @Operation(summary = "List campaigns")
    public ResponseEntity<PagedResponse<CampaignResponse>> list(
            @RequestParam UUID workspaceId,
            @RequestParam(required = false) CampaignStatus status,
            @RequestParam(required = false) CampaignObjective objective,
            Pageable pageable) {
        return ResponseEntity.ok(campaignService.findByWorkspace(workspaceId, status, objective, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get campaign by ID")
    public ResponseEntity<CampaignResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(campaignService.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Update campaign")
    public ResponseEntity<CampaignResponse> update(@PathVariable UUID id,
                                                    @Valid @RequestBody CampaignUpdateRequest request) {
        return ResponseEntity.ok(campaignService.update(id, request));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Activate campaign")
    public ResponseEntity<CampaignResponse> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(campaignService.activate(id));
    }

    @PostMapping("/{id}/pause")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Pause campaign")
    public ResponseEntity<CampaignResponse> pause(@PathVariable UUID id) {
        return ResponseEntity.ok(campaignService.pause(id));
    }

    @GetMapping("/{id}/synced-reports")
    @Operation(summary = "Get synced integration report data for a campaign")
    public ResponseEntity<List<CampaignReportDataResponse>> syncedReports(@PathVariable UUID id) {
        return ResponseEntity.ok(
                reportDataRepo.findByInternalCampaignId(id).stream()
                        .map(IntegrationMapper::toReportDataResponse)
                        .toList());
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Archive campaign")
    public ResponseEntity<CampaignResponse> archive(@PathVariable UUID id) {
        return ResponseEntity.ok(campaignService.archive(id));
    }

    @PostMapping("/{id}/target-sets")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Create target set for campaign")
    public ResponseEntity<TargetSetResponse> createTargetSet(@PathVariable UUID id,
                                                              @Valid @RequestBody TargetSetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(targetSetService.create(id, request));
    }

    @GetMapping("/{id}/target-sets")
    @Operation(summary = "List target sets for campaign")
    public ResponseEntity<List<TargetSetResponse>> listTargetSets(@PathVariable UUID id) {
        return ResponseEntity.ok(targetSetService.findByCampaignId(id));
    }

    @PutMapping("/{id}/target-sets/{tsId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Update target set")
    public ResponseEntity<TargetSetResponse> updateTargetSet(@PathVariable UUID id,
                                                              @PathVariable UUID tsId,
                                                              @Valid @RequestBody TargetSetRequest request) {
        return ResponseEntity.ok(targetSetService.update(id, tsId, request));
    }

    @DeleteMapping("/{id}/target-sets/{tsId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Delete target set")
    public ResponseEntity<Void> deleteTargetSet(@PathVariable UUID id, @PathVariable UUID tsId) {
        targetSetService.delete(id, tsId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/sponsored-units")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Create sponsored unit for campaign")
    public ResponseEntity<SponsoredUnitResponse> createUnit(@PathVariable UUID id,
                                                             @Valid @RequestBody SponsoredUnitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sponsoredUnitService.create(id, request));
    }

    @GetMapping("/{id}/sponsored-units")
    @Operation(summary = "List sponsored units for campaign")
    public ResponseEntity<List<SponsoredUnitResponse>> listUnits(@PathVariable UUID id) {
        return ResponseEntity.ok(sponsoredUnitService.findByCampaignId(id));
    }

    @PutMapping("/{id}/sponsored-units/{suId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Update sponsored unit")
    public ResponseEntity<SponsoredUnitResponse> updateUnit(@PathVariable UUID id,
                                                             @PathVariable UUID suId,
                                                             @Valid @RequestBody SponsoredUnitRequest request) {
        return ResponseEntity.ok(sponsoredUnitService.update(id, suId, request));
    }

    @DeleteMapping("/{id}/sponsored-units/{suId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Delete sponsored unit")
    public ResponseEntity<Void> deleteUnit(@PathVariable UUID id, @PathVariable UUID suId) {
        sponsoredUnitService.delete(id, suId);
        return ResponseEntity.noContent().build();
    }
}
