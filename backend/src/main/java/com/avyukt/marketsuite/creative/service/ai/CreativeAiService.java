package com.avyukt.marketsuite.creative.service.ai;

import com.avyukt.marketsuite.ai.domain.AiActionProposal;
import com.avyukt.marketsuite.ai.domain.AiPromptRun;
import com.avyukt.marketsuite.ai.service.AiFacade;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.EnrichAssetRequest;
import com.avyukt.marketsuite.creative.api.dto.EnrichAssetResponse;
import com.avyukt.marketsuite.creative.api.dto.GenerateCopyRequest;
import com.avyukt.marketsuite.creative.api.dto.GenerateCopyResponse;
import com.avyukt.marketsuite.creative.api.dto.GenerateHooksRequest;
import com.avyukt.marketsuite.creative.api.dto.GenerateHooksResponse;
import com.avyukt.marketsuite.creative.api.dto.GenerateUgcBriefRequest;
import com.avyukt.marketsuite.creative.api.dto.GenerateUgcBriefResponse;
import com.avyukt.marketsuite.creative.api.dto.GenerateVideoScriptRequest;
import com.avyukt.marketsuite.creative.api.dto.GenerateVideoScriptResponse;
import com.avyukt.marketsuite.creative.domain.CopyArtifactType;
import com.avyukt.marketsuite.creative.domain.CopyStatus;
import com.avyukt.marketsuite.creative.domain.CreativeAiRunLink;
import com.avyukt.marketsuite.creative.domain.CreativeAsset;
import com.avyukt.marketsuite.creative.domain.CreativeCopyArtifact;
import com.avyukt.marketsuite.creative.domain.CreativeVariant;
import com.avyukt.marketsuite.creative.domain.CreativeVariantSet;
import com.avyukt.marketsuite.creative.repo.CreativeAiRunLinkRepository;
import com.avyukt.marketsuite.creative.repo.CreativeAssetRepository;
import com.avyukt.marketsuite.creative.repo.CreativeCopyArtifactRepository;
import com.avyukt.marketsuite.creative.repo.CreativeVariantRepository;
import com.avyukt.marketsuite.creative.repo.CreativeVariantSetRepository;
import com.avyukt.marketsuite.governance.api.dto.GovernanceCheckRunResponse;
import com.avyukt.marketsuite.governance.service.GovernanceCheckService;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class CreativeAiService {

    private final AiFacade aiFacade;
    private final GovernanceCheckService governanceCheckService;
    private final AuditService auditService;
    private final PermissionService permissionService;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final CreativeCopyArtifactRepository creativeCopyArtifactRepository;
    private final CreativeVariantSetRepository creativeVariantSetRepository;
    private final CreativeVariantRepository creativeVariantRepository;
    private final CreativeAiRunLinkRepository creativeAiRunLinkRepository;
    private final CreativeAssetRepository creativeAssetRepository;
    private final ObjectMapper objectMapper;

    public CreativeAiService(
            AiFacade aiFacade,
            GovernanceCheckService governanceCheckService,
            AuditService auditService,
            PermissionService permissionService,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            CreativeCopyArtifactRepository creativeCopyArtifactRepository,
            CreativeVariantSetRepository creativeVariantSetRepository,
            CreativeVariantRepository creativeVariantRepository,
            CreativeAiRunLinkRepository creativeAiRunLinkRepository,
            CreativeAssetRepository creativeAssetRepository,
            ObjectMapper objectMapper) {
        this.aiFacade = aiFacade;
        this.governanceCheckService = governanceCheckService;
        this.auditService = auditService;
        this.permissionService = permissionService;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.creativeCopyArtifactRepository = creativeCopyArtifactRepository;
        this.creativeVariantSetRepository = creativeVariantSetRepository;
        this.creativeVariantRepository = creativeVariantRepository;
        this.creativeAiRunLinkRepository = creativeAiRunLinkRepository;
        this.creativeAssetRepository = creativeAssetRepository;
        this.objectMapper = objectMapper;
    }

    public GenerateCopyResponse generateCopyVariants(UUID workspaceId, GenerateCopyRequest request) {
        Workspace ws = requireWorkspaceWithPermission(workspaceId);
        UUID orgId = ws.getOrg().getId();
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        String inputJsonString;
        try {
            ObjectNode input = objectMapper.createObjectNode();
            int numVariants = request.numVariants() != null ? request.numVariants() : 3;
            input.put("numVariants", numVariants);
            input.set("brandProfile", objectMapper.createObjectNode());
            if (request.templateId() != null) {
                ObjectNode template = objectMapper.createObjectNode();
                template.put("id", request.templateId().toString());
                input.set("template", template);
            } else {
                input.set("template", objectMapper.createObjectNode());
            }
            if (request.personaResearchId() != null) {
                ObjectNode persona = objectMapper.createObjectNode();
                persona.put("id", request.personaResearchId().toString());
                input.set("persona", persona);
            } else {
                input.set("persona", objectMapper.createObjectNode());
            }
            if (request.keywordClusterId() != null) {
                ArrayNode keywords = objectMapper.createArrayNode();
                keywords.add(request.keywordClusterId().toString());
                input.set("keywords", keywords);
            } else {
                input.set("keywords", objectMapper.createArrayNode());
            }
            ArrayNode insights = objectMapper.createArrayNode();
            if (request.insightIds() != null && !request.insightIds().isBlank()) {
                for (String part : request.insightIds().split(",")) {
                    String t = part.trim();
                    if (!t.isEmpty()) {
                        insights.add(t);
                    }
                }
            }
            input.set("insights", insights);
            input.put("platformType", request.platformType() != null ? request.platformType() : "");
            input.put("language", request.language());
            input.put("tone", request.toneOverride() != null ? request.toneOverride() : "");
            input.set("constraints", objectMapper.createObjectNode());
            inputJsonString = objectMapper.writeValueAsString(input);
        } catch (Exception e) {
            throw new BusinessException("Failed to build AI input JSON: " + e.getMessage());
        }

        AiPromptRun run = aiFacade.runPrompt(workspaceId, "creative.generate_ad_copy_variants", inputJsonString, Map.of());

        JsonNode root;
        try {
            String out = run.getOutputJson();
            if (out == null || out.isBlank()) {
                throw new BusinessException("AI run returned no JSON output");
            }
            root = objectMapper.readTree(out);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("Failed to parse AI output JSON: " + e.getMessage());
        }

        JsonNode variantsNode = root.get("variants");
        if (variantsNode == null || !variantsNode.isArray()) {
            throw new BusinessException("AI output missing \"variants\" array");
        }

        CopyArtifactType copyType = parseCopyType(request.copyArtifactType());
        String disclaimerJson =
                request.disclaimerIds() != null && !request.disclaimerIds().isBlank()
                        ? request.disclaimerIds()
                        : "[]";

        List<CreativeCopyArtifact> savedArtifacts = new ArrayList<>();
        int index = 0;
        for (JsonNode variant : variantsNode) {
            String contentText = combineVariantText(variant);
            String contentJson;
            try {
                contentJson = objectMapper.writeValueAsString(variant);
            } catch (Exception e) {
                throw new BusinessException("Failed to serialize variant JSON: " + e.getMessage());
            }

            CreativeCopyArtifact artifact =
                    CreativeCopyArtifact.builder()
                            .workspace(ws)
                            .org(ws.getOrg())
                            .type(copyType)
                            .status(CopyStatus.DRAFT)
                            .name(request.name() + " v" + (index + 1))
                            .language(request.language())
                            .contentText(contentText)
                            .contentJson(contentJson)
                            .templateId(request.templateId())
                            .ruleSetId(request.ruleSetId())
                            .disclaimerIds(disclaimerJson)
                            .createdByUser(user)
                            .updatedByUser(user)
                            .build();
            savedArtifacts.add(creativeCopyArtifactRepository.save(artifact));
            index++;
        }

        if (savedArtifacts.isEmpty()) {
            throw new BusinessException("No copy variants were produced");
        }

        CreativeCopyArtifact first = savedArtifacts.get(0);
        CreativeVariantSet variantSet =
                CreativeVariantSet.builder()
                        .workspace(ws)
                        .name(request.name() + " Variants")
                        .parentEntityType("COPY")
                        .parentEntityId(first.getId())
                        .strategy("AI_GENERATED")
                        .parametersJson("{}")
                        .createdByUser(user)
                        .build();
        CreativeVariantSet savedSet = creativeVariantSetRepository.save(variantSet);

        int vi = 0;
        for (CreativeCopyArtifact art : savedArtifacts) {
            CreativeVariant cv =
                    CreativeVariant.builder()
                            .variantSet(savedSet)
                            .variantIndex(vi++)
                            .entityType("COPY_ARTIFACT")
                            .entityId(art.getId())
                            .build();
            creativeVariantRepository.save(cv);
        }

        List<String> governanceStatuses = new ArrayList<>();
        PlatformType platform = parsePlatformTypeOrNull(request.platformType());
        for (CreativeCopyArtifact art : savedArtifacts) {
            if (request.ruleSetId() != null) {
                String payload = buildContentPayloadJson(art);
                GovernanceCheckRunResponse gr =
                        governanceCheckService.runChecks(
                                workspaceId,
                                "COPY_ARTIFACT",
                                art.getId(),
                                payload,
                                request.ruleSetId(),
                                platform,
                                request.language());
                art.setGovernanceCheckRunId(gr.id());
                art.setUpdatedByUser(user);
                creativeCopyArtifactRepository.save(art);
                governanceStatuses.add(gr.status() != null ? gr.status() : "");
            } else {
                governanceStatuses.add("");
            }
        }

        List<UUID> linkIds = new ArrayList<>();
        for (int i = 0; i < savedArtifacts.size(); i++) {
            CreativeCopyArtifact art = savedArtifacts.get(i);
            JsonNode variant = variantsNode.get(i);
            String citationsJson = extractCitationsJson(variant);
            CreativeAiRunLink link =
                    saveAiRunLink(
                            ws,
                            user,
                            run.getId(),
                            "COPY_ARTIFACT",
                            art.getId(),
                            inputJsonString,
                            citationsJson);
            linkIds.add(link.getId());
        }

        auditService.log(
                orgId,
                workspaceId,
                actor,
                "AI_GENERATE_COPY",
                "CreativeVariantSet",
                savedSet.getId(),
                null,
                objectMapper.valueToTree(
                                Map.of(
                                        "runId",
                                        run.getId().toString(),
                                        "artifactIds",
                                        savedArtifacts.stream().map(a -> a.getId().toString()).toList()))
                        .toString());

        return new GenerateCopyResponse(
                savedArtifacts.stream().map(CreativeCopyArtifact::getId).toList(),
                savedSet.getId(),
                run.getId(),
                linkIds,
                governanceStatuses);
    }

    public GenerateHooksResponse generateHooksAnglesCtas(UUID workspaceId, GenerateHooksRequest request) {
        Workspace ws = requireWorkspaceWithPermission(workspaceId);
        UUID orgId = ws.getOrg().getId();
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        String inputJson;
        try {
            ObjectNode input = objectMapper.createObjectNode();
            input.put("topic", request.topic());
            input.set("persona", objectMapper.createObjectNode());
            input.set("insights", objectMapper.createArrayNode());
            input.put("language", request.language());
            inputJson = objectMapper.writeValueAsString(input);
        } catch (Exception e) {
            throw new BusinessException("Failed to build AI input JSON: " + e.getMessage());
        }

        AiPromptRun run =
                aiFacade.runPrompt(workspaceId, "creative.generate_hooks_angles_ctas", inputJson, Map.of());

        JsonNode root = parseOutputJson(run);

        List<String> hooks = readStringList(root, "hooks");
        List<String> angles = readStringList(root, "angles");
        List<String> ctas = readStringList(root, "ctas");

        String hooksText = String.join("\n", hooks);
        String anglesText = String.join("\n", angles);
        String ctasText = String.join("\n", ctas);

        String base = request.topic();
        CreativeCopyArtifact hookArt =
                saveListArtifact(ws, user, CopyArtifactType.HOOK_LIST, base + " — Hooks", request.language(), hooksText, root);
        CreativeCopyArtifact angleArt =
                saveListArtifact(ws, user, CopyArtifactType.ANGLE_LIST, base + " — Angles", request.language(), anglesText, root);
        CreativeCopyArtifact ctaArt =
                saveListArtifact(ws, user, CopyArtifactType.CTA_LIST, base + " — CTAs", request.language(), ctasText, root);

        List<UUID> artifactIds =
                List.of(hookArt.getId(), angleArt.getId(), ctaArt.getId());

        for (UUID aid : artifactIds) {
            saveAiRunLink(ws, user, run.getId(), "COPY_ARTIFACT", aid, inputJson, "[]");
        }

        auditService.log(
                orgId,
                workspaceId,
                actor,
                "AI_GENERATE_HOOKS",
                "CreativeCopyArtifact",
                hookArt.getId(),
                null,
                "{\"runId\":\"" + run.getId() + "\"}");

        return new GenerateHooksResponse(artifactIds, run.getId());
    }

    public GenerateVideoScriptResponse generateVideoScript(UUID workspaceId, GenerateVideoScriptRequest request) {
        Workspace ws = requireWorkspaceWithPermission(workspaceId);
        AppUser user = userRepository.getReferenceById(SecurityUtils.currentUserId());

        String inputJson;
        try {
            ObjectNode input = objectMapper.createObjectNode();
            input.put("product", request.product());
            input.put("offer", request.offer() != null ? request.offer() : "");
            input.put("durationSeconds", request.durationSeconds() != null ? request.durationSeconds() : 0);
            input.put("platformType", request.platformType() != null ? request.platformType() : "");
            input.put("language", request.language());
            if (request.personaResearchId() != null) {
                ObjectNode persona = objectMapper.createObjectNode();
                persona.put("id", request.personaResearchId().toString());
                input.set("persona", persona);
            } else {
                input.set("persona", objectMapper.createObjectNode());
            }
            inputJson = objectMapper.writeValueAsString(input);
        } catch (Exception e) {
            throw new BusinessException("Failed to build AI input JSON: " + e.getMessage());
        }

        AiPromptRun run = aiFacade.runPrompt(workspaceId, "creative.generate_video_script", inputJson, Map.of());
        JsonNode root = parseOutputJson(run);

        String script;
        try {
            JsonNode s = root.get("script");
            script = s != null && !s.isNull() ? s.asText("") : root.toPrettyString();
        } catch (Exception e) {
            throw new BusinessException("Failed to read script from AI output: " + e.getMessage());
        }

        String outputStr;
        try {
            outputStr = objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new BusinessException("Failed to serialize AI output: " + e.getMessage());
        }

        CreativeCopyArtifact artifact =
                CreativeCopyArtifact.builder()
                        .workspace(ws)
                        .org(ws.getOrg())
                        .type(CopyArtifactType.VIDEO_SCRIPT)
                        .status(CopyStatus.DRAFT)
                        .name(request.product() + " — Video script")
                        .language(request.language())
                        .contentText(script)
                        .contentJson(outputStr)
                        .disclaimerIds("[]")
                        .createdByUser(user)
                        .updatedByUser(user)
                        .build();
        CreativeCopyArtifact saved = creativeCopyArtifactRepository.save(artifact);

        saveAiRunLink(ws, user, run.getId(), "COPY_ARTIFACT", saved.getId(), inputJson, "[]");

        return new GenerateVideoScriptResponse(saved.getId(), run.getId());
    }

    public GenerateUgcBriefResponse generateUgcBrief(UUID workspaceId, GenerateUgcBriefRequest request) {
        Workspace ws = requireWorkspaceWithPermission(workspaceId);
        AppUser user = userRepository.getReferenceById(SecurityUtils.currentUserId());

        String inputJson;
        try {
            ObjectNode input = objectMapper.createObjectNode();
            input.put("product", request.product());
            input.put("deliverables", request.deliverables() != null ? request.deliverables() : "");
            input.put("language", request.language());
            input.put("tone", request.toneOverride() != null ? request.toneOverride() : "");
            inputJson = objectMapper.writeValueAsString(input);
        } catch (Exception e) {
            throw new BusinessException("Failed to build AI input JSON: " + e.getMessage());
        }

        AiPromptRun run = aiFacade.runPrompt(workspaceId, "creative.generate_ugc_brief", inputJson, Map.of());
        JsonNode root = parseOutputJson(run);

        String contentText;
        try {
            JsonNode brief = root.get("brief");
            if (brief != null && !brief.isNull() && brief.isTextual()) {
                contentText = brief.asText();
            } else if (brief != null && !brief.isNull()) {
                contentText = objectMapper.writeValueAsString(brief);
            } else {
                contentText = root.toPrettyString();
            }
        } catch (Exception e) {
            throw new BusinessException("Failed to build UGC brief text: " + e.getMessage());
        }

        String contentJson;
        try {
            contentJson = objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new BusinessException("Failed to serialize AI output: " + e.getMessage());
        }

        CreativeCopyArtifact artifact =
                CreativeCopyArtifact.builder()
                        .workspace(ws)
                        .org(ws.getOrg())
                        .type(CopyArtifactType.UGC_BRIEF)
                        .status(CopyStatus.DRAFT)
                        .name(request.product() + " — UGC brief")
                        .language(request.language())
                        .contentText(contentText)
                        .contentJson(contentJson)
                        .disclaimerIds("[]")
                        .createdByUser(user)
                        .updatedByUser(user)
                        .build();
        CreativeCopyArtifact saved = creativeCopyArtifactRepository.save(artifact);

        saveAiRunLink(ws, user, run.getId(), "COPY_ARTIFACT", saved.getId(), inputJson, "[]");

        return new GenerateUgcBriefResponse(saved.getId(), run.getId());
    }

    public EnrichAssetResponse enrichAssetMetadata(UUID workspaceId, UUID assetId, EnrichAssetRequest request) {
        Workspace ws = requireWorkspaceWithPermission(workspaceId);
        UUID orgId = ws.getOrg().getId();
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeAsset asset =
                creativeAssetRepository
                        .findById(assetId)
                        .orElseThrow(() -> new ResourceNotFoundException("CreativeAsset", "id", assetId));
        if (!asset.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("CreativeAsset", "id", assetId);
        }

        String inputJson;
        try {
            ObjectNode input = objectMapper.createObjectNode();
            input.put("name", asset.getName() != null ? asset.getName() : "");
            input.put("description", asset.getDescription() != null ? asset.getDescription() : "");
            input.put("assetType", asset.getAssetType() != null ? asset.getAssetType().name() : "");
            JsonNode tagsNode = objectMapper.readTree(asset.getTags() != null ? asset.getTags() : "[]");
            input.set("currentTags", tagsNode.isArray() ? tagsNode : objectMapper.createArrayNode());
            input.put("sourceUrl", asset.getSourceUrl() != null ? asset.getSourceUrl() : "");
            input.put(
                    "platformType",
                    request.platformType() != null ? request.platformType() : "");
            input.put("language", request.language() != null ? request.language() : "");
            inputJson = objectMapper.writeValueAsString(input);
        } catch (Exception e) {
            throw new BusinessException("Failed to build AI input JSON: " + e.getMessage());
        }

        AiPromptRun run =
                aiFacade.runPrompt(workspaceId, "creative.enrich_asset_metadata", inputJson, Map.of());

        UUID convId =
                aiFacade.startConversation(workspaceId, "Enrich asset: " + asset.getName(), Map.of());

        String outputPayload = run.getOutputJson() != null ? run.getOutputJson() : "{}";
        AiActionProposal proposal =
                aiFacade.proposeAction(
                        workspaceId,
                        convId,
                        "Enrich metadata for " + asset.getName(),
                        "ENRICH_ASSET_METADATA",
                        "CREATIVE_ASSET",
                        assetId,
                        outputPayload);

        saveAiRunLink(
                ws,
                user,
                run.getId(),
                "ASSET_METADATA_ENRICHMENT",
                assetId,
                inputJson,
                "[]");

        auditService.log(
                orgId,
                workspaceId,
                actor,
                "AI_ENRICH_ASSET_METADATA",
                "CreativeAsset",
                assetId,
                null,
                "{\"proposalId\":\"" + proposal.getId() + "\",\"runId\":\"" + run.getId() + "\"}");

        return new EnrichAssetResponse(proposal.getId(), run.getId());
    }

    private CreativeCopyArtifact saveListArtifact(
            Workspace ws,
            AppUser user,
            CopyArtifactType type,
            String name,
            String language,
            String contentText,
            JsonNode fullOutput) {
        String contentJson;
        try {
            contentJson = objectMapper.writeValueAsString(fullOutput);
        } catch (Exception e) {
            throw new BusinessException("Failed to serialize AI output: " + e.getMessage());
        }
        CreativeCopyArtifact artifact =
                CreativeCopyArtifact.builder()
                        .workspace(ws)
                        .org(ws.getOrg())
                        .type(type)
                        .status(CopyStatus.DRAFT)
                        .name(name)
                        .language(language)
                        .contentText(contentText)
                        .contentJson(contentJson)
                        .disclaimerIds("[]")
                        .createdByUser(user)
                        .updatedByUser(user)
                        .build();
        return creativeCopyArtifactRepository.save(artifact);
    }

    private List<String> readStringList(JsonNode root, String field) {
        JsonNode arr = root.get(field);
        List<String> out = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode n : arr) {
                if (n.isTextual()) {
                    out.add(n.asText());
                } else {
                    out.add(n.toString());
                }
            }
        }
        return out;
    }

    private JsonNode parseOutputJson(AiPromptRun run) {
        try {
            String out = run.getOutputJson();
            if (out == null || out.isBlank()) {
                throw new BusinessException("AI run returned no JSON output");
            }
            return objectMapper.readTree(out);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("Failed to parse AI output JSON: " + e.getMessage());
        }
    }

    private CreativeAiRunLink saveAiRunLink(
            Workspace ws,
            AppUser user,
            UUID aiPromptRunId,
            String producedEntityType,
            UUID producedEntityId,
            String inputContextJson,
            String citationsJson) {
        CreativeAiRunLink link =
                CreativeAiRunLink.builder()
                        .workspace(ws)
                        .aiPromptRunId(aiPromptRunId)
                        .producedEntityType(producedEntityType)
                        .producedEntityId(producedEntityId)
                        .inputContextJson(inputContextJson != null ? inputContextJson : "{}")
                        .citationsJson(citationsJson != null ? citationsJson : "[]")
                        .createdByUser(user)
                        .build();
        return creativeAiRunLinkRepository.save(link);
    }

    private String extractCitationsJson(JsonNode variant) {
        try {
            JsonNode c = variant.get("citations");
            if (c == null) {
                return "[]";
            }
            return objectMapper.writeValueAsString(c);
        } catch (Exception e) {
            log.warn("Could not serialize citations: {}", e.getMessage());
            return "[]";
        }
    }

    private String combineVariantText(JsonNode variant) {
        String primary = textOrEmpty(variant, "primaryText");
        String headline = textOrEmpty(variant, "headline");
        String description = textOrEmpty(variant, "description");
        String cta = textOrEmpty(variant, "cta");
        StringBuilder sb = new StringBuilder();
        if (!headline.isEmpty()) {
            sb.append("Headline: ").append(headline).append('\n');
        }
        if (!primary.isEmpty()) {
            sb.append("Primary: ").append(primary).append('\n');
        }
        if (!description.isEmpty()) {
            sb.append("Description: ").append(description).append('\n');
        }
        if (!cta.isEmpty()) {
            sb.append("CTA: ").append(cta);
        }
        String s = sb.toString().trim();
        return s.isEmpty() ? variant.toPrettyString() : s;
    }

    private String textOrEmpty(JsonNode node, String field) {
        JsonNode v = node.get(field);
        if (v == null || v.isNull()) {
            return "";
        }
        return v.asText("");
    }

    private String buildContentPayloadJson(CreativeCopyArtifact artifact) {
        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("contentText", artifact.getContentText());
            try {
                payload.set("contentJson", objectMapper.readTree(artifact.getContentJson()));
            } catch (Exception e) {
                payload.put("contentJson", artifact.getContentJson());
            }
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.warn("Failed to build governance content payload", e);
            return "{}";
        }
    }

    private CopyArtifactType parseCopyType(String raw) {
        try {
            return CopyArtifactType.valueOf(raw.trim());
        } catch (Exception e) {
            throw new BusinessException("Invalid copy artifact type: " + raw);
        }
    }

    private PlatformType parsePlatformTypeOrNull(String platformType) {
        if (platformType == null || platformType.isBlank()) {
            return null;
        }
        try {
            return PlatformType.valueOf(platformType.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private Workspace requireWorkspaceWithPermission(UUID workspaceId) {
        Workspace ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeAiUse(orgId, workspaceId);
        return ws;
    }
}
