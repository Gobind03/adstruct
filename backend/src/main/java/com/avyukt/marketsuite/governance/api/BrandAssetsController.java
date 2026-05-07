package com.avyukt.marketsuite.governance.api;

import com.avyukt.marketsuite.governance.api.dto.BrandAssetCreateRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandAssetPatchRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandAssetResponse;
import com.avyukt.marketsuite.governance.domain.BrandStatus;
import com.avyukt.marketsuite.governance.service.BrandAssetService;
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
@RequestMapping("/api/v1/orgs/{orgId}/brand-assets")
@Tag(name = "Brand Assets")
@SecurityRequirement(name = "bearerAuth")
public class BrandAssetsController {

    private final BrandAssetService service;

    public BrandAssetsController(BrandAssetService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List brand assets")
    public ResponseEntity<List<BrandAssetResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) String status) {
        BrandStatus s = status != null ? BrandStatus.valueOf(status) : null;
        return ResponseEntity.ok(service.list(orgId, workspaceId, s));
    }

    @PostMapping
    @Operation(summary = "Register brand asset")
    public ResponseEntity<BrandAssetResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody BrandAssetCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(orgId, request));
    }

    @PatchMapping("/{assetId}")
    @Operation(summary = "Update brand asset")
    public ResponseEntity<BrandAssetResponse> patch(
            @PathVariable UUID orgId,
            @PathVariable UUID assetId,
            @Valid @RequestBody BrandAssetPatchRequest request) {
        return ResponseEntity.ok(service.patch(orgId, assetId, request));
    }
}
