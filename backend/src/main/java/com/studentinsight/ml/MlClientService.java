package com.studentinsight.ml;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentinsight.common.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MlClientService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.ml.service-url:http://localhost:8001}")
    private String mlServiceUrl;

    @Value("${app.ml.api-key:}")
    private String mlApiKey;

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
        if (mlApiKey != null && !mlApiKey.isBlank()) {
            headers.set("X-ML-API-Key", mlApiKey.trim());
        }
        return headers;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String path, Map<String, Object> queryParams) {
        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromHttpUrl(mlServiceUrl + path);
        if (queryParams != null) {
            queryParams.forEach((k, v) -> {
                if (v != null && !String.valueOf(v).isBlank()) {
                    uriBuilder.queryParam(k, v);
                }
            });
        }
        String url = uriBuilder.toUriString();
        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            throw new MlServiceUnavailableException("Layanan ML tidak memberikan respons yang valid.");
        } catch (HttpStatusCodeException ex) {
            handleHttpError(url, ex);
            return Map.of();
        } catch (ResourceAccessException ex) {
            log.warn("ML service unreachable at {}: {}", url, ex.getMessage());
            throw new MlServiceUnavailableException(
                    "Layanan Machine Learning sedang tidak aktif di " + mlServiceUrl + ". Pastikan layanan Python ML berjalan.", ex);
        } catch (MlServiceUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error calling ML service GET {}", url, ex);
            throw new MlServiceUnavailableException("Gagal menghubungi layanan ML: " + ex.getMessage(), ex);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> post(String path, Map<String, Object> body) {
        String url = mlServiceUrl + path;
        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body != null ? body : Map.of(), buildHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            throw new MlServiceUnavailableException("Layanan ML tidak memberikan respons yang valid.");
        } catch (HttpStatusCodeException ex) {
            handleHttpError(url, ex);
            return Map.of();
        } catch (ResourceAccessException ex) {
            log.warn("ML service unreachable at {}: {}", url, ex.getMessage());
            throw new MlServiceUnavailableException(
                    "Layanan Machine Learning sedang tidak aktif di " + mlServiceUrl + ". Pastikan layanan Python ML berjalan.", ex);
        } catch (MlServiceUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error calling ML service POST {}", url, ex);
            throw new MlServiceUnavailableException("Gagal menghubungi layanan ML: " + ex.getMessage(), ex);
        }
    }

    private void handleHttpError(String url, HttpStatusCodeException ex) {
        String detail = extractDetail(ex.getResponseBodyAsString());
        int code = ex.getStatusCode().value();
        log.warn("ML service returned HTTP {} for {}: {}", code, url, detail);
        if (code == 400 || code == 404 || code == 422) {
            throw new BadRequestException(detail);
        }
        throw new MlServiceUnavailableException("Layanan ML mengembalikan kesalahan (" + code + "): " + detail, ex);
    }

    private String extractDetail(String body) {
        if (body == null || body.isBlank()) {
            return "Permintaan ML tidak dapat diproses.";
        }
        try {
            JsonNode node = objectMapper.readTree(body);
            if (node.has("detail")) {
                return node.get("detail").asText();
            }
        } catch (Exception ignored) {
        }
        return body;
    }
}
