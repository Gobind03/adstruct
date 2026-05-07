package com.avyukt.marketsuite.common.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleResourceNotFound(ResourceNotFoundException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        detail.setType(URI.create("https://api.marketsuite.com/errors/not-found"));
        detail.setTitle("Resource Not Found");
        detail.setProperty("timestamp", OffsetDateTime.now());
        return detail;
    }

    @ExceptionHandler(BusinessException.class)
    public ProblemDetail handleBusinessException(BusinessException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        detail.setType(URI.create("https://api.marketsuite.com/errors/business-error"));
        detail.setTitle("Business Rule Violation");
        detail.setProperty("timestamp", OffsetDateTime.now());
        return detail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fieldErrors.put(e.getField(), e.getDefaultMessage()));
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        detail.setType(URI.create("https://api.marketsuite.com/errors/validation"));
        detail.setTitle("Validation Error");
        detail.setProperty("fieldErrors", fieldErrors);
        detail.setProperty("timestamp", OffsetDateTime.now());
        return detail;
    }

    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthentication(AuthenticationException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        detail.setType(URI.create("https://api.marketsuite.com/errors/unauthorized"));
        detail.setTitle("Unauthorized");
        detail.setProperty("timestamp", OffsetDateTime.now());
        return detail;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access denied");
        detail.setType(URI.create("https://api.marketsuite.com/errors/forbidden"));
        detail.setTitle("Forbidden");
        detail.setProperty("timestamp", OffsetDateTime.now());
        return detail;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "A record with the same key already exists");
        detail.setType(URI.create("https://api.marketsuite.com/errors/conflict"));
        detail.setTitle("Duplicate Record");
        detail.setProperty("timestamp", OffsetDateTime.now());
        return detail;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        detail.setType(URI.create("https://api.marketsuite.com/errors/bad-request"));
        detail.setTitle("Bad Request");
        detail.setProperty("timestamp", OffsetDateTime.now());
        return detail;
    }

    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail handleIllegalState(IllegalStateException ex) {
        log.error("IllegalStateException", ex);
        String msg = ex.getMessage() != null ? ex.getMessage() : "An illegal state occurred";
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, msg);
        detail.setType(URI.create("https://api.marketsuite.com/errors/internal"));
        detail.setTitle("Internal Server Error");
        detail.setProperty("timestamp", OffsetDateTime.now());
        return detail;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneral(Exception ex) {
        log.error("Unhandled exception: {} - {}", ex.getClass().getSimpleName(), ex.getMessage(), ex);
        String msg = ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred";
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, msg);
        detail.setType(URI.create("https://api.marketsuite.com/errors/internal"));
        detail.setTitle("Internal Server Error");
        detail.setProperty("exceptionType", ex.getClass().getSimpleName());
        detail.setProperty("timestamp", OffsetDateTime.now());
        return detail;
    }
}
