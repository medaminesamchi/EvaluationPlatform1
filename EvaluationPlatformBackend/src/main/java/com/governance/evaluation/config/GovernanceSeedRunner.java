package com.governance.evaluation.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.governance.evaluation.entity.Criterion;
import com.governance.evaluation.entity.Practice;
import com.governance.evaluation.entity.Principle;
import com.governance.evaluation.repository.CriterionRepository;
import com.governance.evaluation.repository.PracticeRepository;
import com.governance.evaluation.repository.PrincipleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDateTime;

/**
 * Optional one-time load of governance framework from classpath:governance/seed.json
 * Enable with governance.seed.enabled=true (only runs when principles table is empty).
 */
@Component
@Order(100)
@RequiredArgsConstructor
public class GovernanceSeedRunner implements ApplicationRunner {

    private final PrincipleRepository principleRepository;
    private final PracticeRepository practiceRepository;
    private final CriterionRepository criterionRepository;
    private final ObjectMapper objectMapper;

    @Value("${governance.seed.enabled:false}")
    private boolean seedEnabled;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!seedEnabled || principleRepository.count() > 0) {
            return;
        }
        try {
            ClassPathResource resource = new ClassPathResource("governance/seed.json");
            if (!resource.exists()) {
                return;
            }
            try (InputStream is = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(is);
                JsonNode principles = root.get("principles");
                if (principles == null || !principles.isArray()) {
                    return;
                }
                for (JsonNode pNode : principles) {
                    Principle p = new Principle();
                    p.setName(pNode.get("name").asText());
                    p.setDescription(pNode.has("description") ? pNode.get("description").asText(null) : null);
                    p.setOrderIndex(pNode.get("orderIndex").asInt());
                    p.setIsActive(true);
                    p.setCreatedAt(LocalDateTime.now());
                    p = principleRepository.save(p);

                    JsonNode practices = pNode.get("practices");
                    if (practices == null || !practices.isArray()) continue;

                    for (JsonNode prNode : practices) {
                        Practice pr = new Practice();
                        pr.setPrinciple(p);
                        pr.setName(prNode.get("name").asText());
                        pr.setDescription(prNode.has("description") ? prNode.get("description").asText(null) : null);
                        pr.setOrderIndex(prNode.get("orderIndex").asInt());
                        pr.setIsActive(true);
                        pr.setCreatedAt(LocalDateTime.now());
                        pr = practiceRepository.save(pr);

                        JsonNode criteria = prNode.get("criteria");
                        if (criteria == null || !criteria.isArray()) continue;

                        for (JsonNode cNode : criteria) {
                            Criterion c = new Criterion();
                            c.setPractice(pr);
                            c.setDescription(cNode.get("description").asText());
                            c.setOrderIndex(cNode.get("orderIndex").asInt());
                            c.setIsActive(true);
                            if (cNode.has("evidenceText") && !cNode.get("evidenceText").isNull()) {
                                c.setEvidenceText(cNode.get("evidenceText").asText(null));
                            }
                            if (cNode.has("referenceText") && !cNode.get("referenceText").isNull()) {
                                c.setReferenceText(cNode.get("referenceText").asText(null));
                            }
                            c.setCreatedAt(LocalDateTime.now());
                            criterionRepository.save(c);
                        }
                    }
                }
            }
            System.out.println("✅ Governance framework seeded from governance/seed.json");
        } catch (Exception e) {
            System.err.println("❌ Governance seed failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
