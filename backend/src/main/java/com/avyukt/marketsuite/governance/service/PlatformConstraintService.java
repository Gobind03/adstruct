package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.governance.api.dto.PlatformConstraintResponse;
import com.avyukt.marketsuite.governance.api.mapper.GovernanceMapper;
import com.avyukt.marketsuite.governance.repo.PlatformConstraintRepository;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PlatformConstraintService {

    private final PlatformConstraintRepository repository;
    private final GovernanceMapper mapper;

    public PlatformConstraintService(PlatformConstraintRepository repository, GovernanceMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public List<PlatformConstraintResponse> listByPlatform(PlatformType platformType) {
        return repository.findByPlatformType(platformType).stream()
                .map(mapper::toConstraintResponse)
                .toList();
    }

    public List<PlatformConstraintResponse> listAll() {
        return repository.findAll().stream().map(mapper::toConstraintResponse).toList();
    }
}
