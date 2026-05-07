package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.research.domain.PersonaResearch;
import com.avyukt.marketsuite.research.domain.Sentiment;
import com.avyukt.marketsuite.research.domain.SourceSnapshot;
import com.avyukt.marketsuite.research.repo.PersonaResearchRepository;
import com.avyukt.marketsuite.research.repo.SourceSnapshotRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PersonaResearchService {

    private final PersonaResearchRepository personaResearchRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public PersonaResearchService(
            PersonaResearchRepository personaResearchRepository,
            SourceSnapshotRepository sourceSnapshotRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.personaResearchRepository = personaResearchRepository;
        this.sourceSnapshotRepository = sourceSnapshotRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<PersonaResearch> list(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return personaResearchRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional(readOnly = true)
    public PersonaResearch get(UUID workspaceId, UUID personaId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        PersonaResearch p = personaResearchRepository
                .findById(personaId)
                .orElseThrow(() -> new ResourceNotFoundException("PersonaResearch", "id", personaId));
        assertWorkspaceMatch(p, workspaceId);
        return p;
    }

    public PersonaResearch create(
            UUID workspaceId,
            String name,
            String painsJson,
            String objectionsJson,
            String motivationsJson,
            String channelsJson,
            String language,
            String sentiment,
            UUID sourceSnapshotId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);
        SourceSnapshot snap =
                sourceSnapshotId != null ? sourceSnapshotRepository.getReferenceById(sourceSnapshotId) : null;
        PersonaResearch p = PersonaResearch.builder()
                .workspace(ws)
                .name(name)
                .pains(painsJson != null ? painsJson : "[]")
                .objections(objectionsJson != null ? objectionsJson : "[]")
                .motivations(motivationsJson != null ? motivationsJson : "[]")
                .channels(channelsJson != null ? channelsJson : "[]")
                .language(language != null ? language : "en")
                .sentiment(parseSentiment(sentiment))
                .sourceSnapshot(snap)
                .createdByUser(user)
                .build();
        PersonaResearch saved = personaResearchRepository.save(p);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "PERSONA_CREATE",
                "PersonaResearch",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public PersonaResearch update(
            UUID workspaceId,
            UUID personaId,
            String name,
            String painsJson,
            String objectionsJson,
            String motivationsJson,
            String channelsJson,
            String language,
            String sentiment) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        PersonaResearch p = personaResearchRepository
                .findById(personaId)
                .orElseThrow(() -> new ResourceNotFoundException("PersonaResearch", "id", personaId));
        assertWorkspaceMatch(p, workspaceId);
        String before = toJson(p);
        UUID actor = SecurityUtils.currentUserId();
        if (name != null) {
            p.setName(name);
        }
        if (painsJson != null) {
            p.setPains(painsJson);
        }
        if (objectionsJson != null) {
            p.setObjections(objectionsJson);
        }
        if (motivationsJson != null) {
            p.setMotivations(motivationsJson);
        }
        if (channelsJson != null) {
            p.setChannels(channelsJson);
        }
        if (language != null) {
            p.setLanguage(language);
        }
        if (sentiment != null) {
            p.setSentiment(parseSentiment(sentiment));
        }
        PersonaResearch saved = personaResearchRepository.save(p);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "PERSONA_UPDATE",
                "PersonaResearch",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public void delete(UUID workspaceId, UUID personaId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        PersonaResearch p = personaResearchRepository
                .findById(personaId)
                .orElseThrow(() -> new ResourceNotFoundException("PersonaResearch", "id", personaId));
        assertWorkspaceMatch(p, workspaceId);
        String before = toJson(p);
        UUID actor = SecurityUtils.currentUserId();
        personaResearchRepository.delete(p);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "PERSONA_DELETE",
                "PersonaResearch",
                personaId,
                before,
                null);
    }

    private Sentiment parseSentiment(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        return Sentiment.valueOf(s);
    }

    private void assertWorkspaceMatch(PersonaResearch p, UUID workspaceId) {
        if (!p.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("PersonaResearch", "id", p.getId());
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
