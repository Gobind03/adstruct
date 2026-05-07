package com.avyukt.marketsuite.governance.api;

import com.avyukt.marketsuite.governance.api.dto.BrandRuleCreateRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandRulePatchRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandRuleResponse;
import com.avyukt.marketsuite.governance.service.BrandRuleService;
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
@RequestMapping("/api/v1/rulesets/{ruleSetId}/rules")
@Tag(name = "Brand Rules")
@SecurityRequirement(name = "bearerAuth")
public class RulesController {

    private final BrandRuleService service;

    public RulesController(BrandRuleService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List rules in rule set")
    public ResponseEntity<List<BrandRuleResponse>> list(@PathVariable UUID ruleSetId) {
        return ResponseEntity.ok(service.listByRuleSet(ruleSetId));
    }

    @PostMapping
    @Operation(summary = "Create rule in rule set")
    public ResponseEntity<BrandRuleResponse> create(
            @PathVariable UUID ruleSetId, @Valid @RequestBody BrandRuleCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(ruleSetId, request));
    }

    @PatchMapping("/{ruleId}")
    @Operation(summary = "Patch rule")
    public ResponseEntity<BrandRuleResponse> patch(
            @PathVariable UUID ruleSetId,
            @PathVariable UUID ruleId,
            @Valid @RequestBody BrandRulePatchRequest request) {
        return ResponseEntity.ok(service.patch(ruleSetId, ruleId, request));
    }

    @DeleteMapping("/{ruleId}")
    @Operation(summary = "Delete rule")
    public ResponseEntity<Void> delete(@PathVariable UUID ruleSetId, @PathVariable UUID ruleId) {
        service.delete(ruleSetId, ruleId);
        return ResponseEntity.noContent().build();
    }
}
