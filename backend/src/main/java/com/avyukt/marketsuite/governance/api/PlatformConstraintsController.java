package com.avyukt.marketsuite.governance.api;

import com.avyukt.marketsuite.governance.api.dto.PlatformConstraintResponse;
import com.avyukt.marketsuite.governance.service.PlatformConstraintService;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/platform-constraints")
@Tag(name = "Platform Constraints")
@SecurityRequirement(name = "bearerAuth")
public class PlatformConstraintsController {

    private final PlatformConstraintService service;

    public PlatformConstraintsController(PlatformConstraintService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List platform constraints")
    public ResponseEntity<List<PlatformConstraintResponse>> list(
            @RequestParam(required = false) String platformType) {
        if (platformType != null) {
            return ResponseEntity.ok(service.listByPlatform(PlatformType.valueOf(platformType)));
        }
        return ResponseEntity.ok(service.listAll());
    }
}
