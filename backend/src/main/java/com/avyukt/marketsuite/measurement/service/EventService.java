package com.avyukt.marketsuite.measurement.service;

import com.avyukt.marketsuite.measurement.api.dto.AdEventRequest;
import com.avyukt.marketsuite.measurement.api.dto.AdEventResponse;
import com.avyukt.marketsuite.measurement.api.dto.EventSummaryResponse;
import com.avyukt.marketsuite.measurement.api.mapper.AdEventMapper;
import com.avyukt.marketsuite.measurement.domain.AdEvent;
import com.avyukt.marketsuite.measurement.repo.AdEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class EventService {

    private final AdEventRepository repository;
    private final AdEventMapper mapper;

    public EventService(AdEventRepository repository, AdEventMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public AdEventResponse ingest(AdEventRequest request) {
        AdEvent event = mapper.toEntity(request);
        return mapper.toResponse(repository.save(event));
    }

    @Transactional(readOnly = true)
    public List<EventSummaryResponse> getSummary(UUID workspaceId, UUID campaignId,
                                                  OffsetDateTime from, OffsetDateTime to) {
        List<Object[]> results = repository.findEventSummary(workspaceId, campaignId, from, to);
        return results.stream().map(row -> new EventSummaryResponse(
                (UUID) row[0],
                row[1].toString(),
                (Long) row[2],
                (LocalDate) row[3]
        )).toList();
    }
}
