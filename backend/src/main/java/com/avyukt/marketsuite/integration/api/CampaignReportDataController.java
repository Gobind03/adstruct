package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.api.dto.CampaignReportDataResponse;
import com.avyukt.marketsuite.integration.api.dto.CampaignReportSummaryResponse;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.repo.CampaignReportDataRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orgs/{orgId}/integrations/campaign-reports")
@Tag(name = "Campaign Reports")
@SecurityRequirement(name = "bearerAuth")
public class CampaignReportDataController {

    private final CampaignReportDataRepository reportDataRepo;
    private final PermissionService permissionService;

    public CampaignReportDataController(
            CampaignReportDataRepository reportDataRepo,
            PermissionService permissionService) {
        this.reportDataRepo = reportDataRepo;
        this.permissionService = permissionService;
    }

    @GetMapping
    @Operation(summary = "List synced campaign report data")
    public ResponseEntity<List<CampaignReportDataResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Boolean mapped) {
        permissionService.requireOrgAccess(orgId);
        return ResponseEntity.ok(
                reportDataRepo.findFiltered(orgId, accountId, from, to, mapped).stream()
                        .map(IntegrationMapper::toReportDataResponse)
                        .toList());
    }

    @GetMapping("/summary")
    @Operation(summary = "Get aggregated campaign report summary")
    public ResponseEntity<CampaignReportSummaryResponse> summary(
            @PathVariable UUID orgId,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        permissionService.requireOrgAccess(orgId);
        Object[] row = reportDataRepo.findSummary(orgId, accountId, from, to);
        return ResponseEntity.ok(IntegrationMapper.toReportSummaryResponse(row));
    }
}
