package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.*;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.service.IntegrationProviderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/integration-providers")
@Tag(name = "Integration Providers")
@SecurityRequirement(name = "bearerAuth")
public class IntegrationsController {

    private final IntegrationProviderService providerService;

    public IntegrationsController(IntegrationProviderService providerService) {
        this.providerService = providerService;
    }

    @GetMapping
    @Operation(summary = "List all integration providers")
    public ResponseEntity<List<IntegrationProviderResponse>> listProviders(
            @RequestParam(required = false) IntegrationCategory category) {
        return ResponseEntity.ok(providerService.list(category).stream()
                .map(IntegrationMapper::toProviderResponse)
                .toList());
    }

    @GetMapping("/{platformType}")
    @Operation(summary = "Get provider by platform type")
    public ResponseEntity<IntegrationProviderResponse> getProvider(@PathVariable PlatformType platformType) {
        return ResponseEntity.ok(IntegrationMapper.toProviderResponse(providerService.getByPlatformType(platformType)));
    }
}
