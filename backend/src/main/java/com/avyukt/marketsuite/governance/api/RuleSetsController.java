package com.avyukt.marketsuite.governance.api;

import com.avyukt.marketsuite.governance.api.dto.BrandRuleSetCreateRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandRuleSetPatchRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandRuleSetResponse;
import com.avyukt.marketsuite.governance.domain.BrandStatus;
import com.avyukt.marketsuite.governance.service.BrandRuleSetService;
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
@RequestMapping("/api/v1/orgs/{orgId}/rulesets")
@Tag(name = "Rule Sets")
@SecurityRequirement(name = "bearerAuth")
public class RuleSetsController {

    private final BrandRuleSetService service;

    public RuleSetsController(BrandRuleSetService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List rule sets")
    public ResponseEntity<List<BrandRuleSetResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) String status) {
        BrandStatus s = status != null ? BrandStatus.valueOf(status) : null;
        return ResponseEntity.ok(service.list(orgId, workspaceId, s));
    }

    @PostMapping
    @Operation(summary = "Create rule set")
    public ResponseEntity<BrandRuleSetResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody BrandRuleSetCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(orgId, request));
    }

    @GetMapping("/{ruleSetId}")
    @Operation(summary = "Get rule set")
    public ResponseEntity<BrandRuleSetResponse> get(@PathVariable UUID orgId, @PathVariable UUID ruleSetId) {
        return ResponseEntity.ok(service.get(ruleSetId));
    }

    @PatchMapping("/{ruleSetId}")
    @Operation(summary = "Patch rule set")
    public ResponseEntity<BrandRuleSetResponse> patch(
            @PathVariable UUID orgId,
            @PathVariable UUID ruleSetId,
            @Valid @RequestBody BrandRuleSetPatchRequest request) {
        return ResponseEntity.ok(service.patch(orgId, ruleSetId, request));
    }

    @PostMapping("/{ruleSetId}/archive")
    @Operation(summary = "Archive rule set")
    public ResponseEntity<BrandRuleSetResponse> archive(@PathVariable UUID orgId, @PathVariable UUID ruleSetId) {
        return ResponseEntity.ok(service.archive(orgId, ruleSetId));
    }

    @PostMapping("/{ruleSetId}/clone-to-workspace")
    @Operation(summary = "Clone rule set to workspace")
    public ResponseEntity<BrandRuleSetResponse> cloneToWorkspace(
            @PathVariable UUID orgId,
            @PathVariable UUID ruleSetId,
            @RequestParam UUID workspaceId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.cloneToWorkspace(orgId, ruleSetId, workspaceId));
    }
}
