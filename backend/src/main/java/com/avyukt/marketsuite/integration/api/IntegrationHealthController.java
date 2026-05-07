package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.HealthSummaryResponse;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.service.IntegrationHealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orgs/{orgId}/integrations/accounts/{accountId}/health")
@Tag(name = "Integration Health")
@SecurityRequirement(name = "bearerAuth")
public class IntegrationHealthController {

    private final IntegrationHealthService service;

    public IntegrationHealthController(IntegrationHealthService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Get integration health summary")
    public ResponseEntity<HealthSummaryResponse> getHealth(@PathVariable UUID orgId, @PathVariable UUID accountId) {
        return ResponseEntity.ok(IntegrationMapper.toHealthSummaryResponse(service.computeHealth(accountId)));
    }
}
