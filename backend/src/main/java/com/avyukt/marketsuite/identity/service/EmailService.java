package com.avyukt.marketsuite.identity.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    public void sendInvite(String toEmail, String inviteLink, String orgName) {
        log.info(
                "[EMAIL STUB] Sent invite to {} for org '{}'. Link: {}",
                toEmail,
                orgName,
                inviteLink);
    }
}
