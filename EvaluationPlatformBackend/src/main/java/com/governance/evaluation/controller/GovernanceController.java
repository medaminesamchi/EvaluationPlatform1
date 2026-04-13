package com.governance.evaluation.controller;

import com.governance.evaluation.entity.Criterion;
import com.governance.evaluation.entity.Practice;
import com.governance.evaluation.entity.Principle;
import com.governance.evaluation.repository.CriterionRepository;
import com.governance.evaluation.repository.PracticeRepository;
import com.governance.evaluation.repository.PrincipleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/governance")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class GovernanceController {

    private final PrincipleRepository principleRepository;
    private final PracticeRepository practiceRepository;
    private final CriterionRepository criterionRepository;

    /**
     * Get complete governance framework (Principles → Practices → Criteria)
     * GET /api/governance/framework
     */
    @GetMapping("/framework")
    public ResponseEntity<?> getCompleteFramework() {
        try {
            List<Principle> principles = principleRepository.findByIsActiveTrueOrderByOrderIndexAsc();
            
            List<Map<String, Object>> frameworkData = principles.stream()
                .map(principle -> {
                    Map<String, Object> principleMap = new HashMap<>();
                    principleMap.put("principleId", principle.getPrincipleId());
                    principleMap.put("name", principle.getName());
                    principleMap.put("description", principle.getDescription());
                    principleMap.put("orderIndex", principle.getOrderIndex());
                    
                    // Get practices for this principle
                    List<Practice> practices = practiceRepository
                        .findByPrinciple_PrincipleIdAndIsActiveTrueOrderByOrderIndexAsc(principle.getPrincipleId());
                    
                    List<Map<String, Object>> practicesData = practices.stream()
                        .map(practice -> {
                            Map<String, Object> practiceMap = new HashMap<>();
                            practiceMap.put("practiceId", practice.getPracticeId());
                            practiceMap.put("name", practice.getName());
                            practiceMap.put("description", practice.getDescription());
                            practiceMap.put("orderIndex", practice.getOrderIndex());
                            
                            // Get criteria for this practice
                            List<Criterion> criteria = criterionRepository
                                .findByPractice_PracticeIdAndIsActiveTrueOrderByOrderIndexAsc(practice.getPracticeId());
                            
                            List<Map<String, Object>> criteriaData = criteria.stream()
                                .map(criterion -> {
                                    Map<String, Object> criterionMap = new HashMap<>();
                                    criterionMap.put("criterionId", criterion.getCriterionId());
                                    criterionMap.put("description", criterion.getDescription());
                                    criterionMap.put("evidenceText", criterion.getEvidenceText());
                                    criterionMap.put("referenceText", criterion.getReferenceText());
                                    criterionMap.put("orderIndex", criterion.getOrderIndex());
                                    criterionMap.put("level0Description", criterion.getLevel0Description());
                                    criterionMap.put("level1Description", criterion.getLevel1Description());
                                    criterionMap.put("level2Description", criterion.getLevel2Description());
                                    criterionMap.put("level3Description", criterion.getLevel3Description());
                                    return criterionMap;
                                })
                                .collect(Collectors.toList());
                            
                            practiceMap.put("criteria", criteriaData);
                            return practiceMap;
                        })
                        .collect(Collectors.toList());
                    
                    principleMap.put("practices", practicesData);
                    return principleMap;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(frameworkData);
            
        } catch (Exception e) {
            System.err.println("❌ Error fetching governance framework: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch governance framework"));
        }
    }

    /**
     * Get all principles
     * GET /api/governance/principles
     */
    @GetMapping("/principles")
    public ResponseEntity<?> getAllPrinciples() {
        try {
            List<Principle> principles = principleRepository.findByIsActiveTrueOrderByOrderIndexAsc();
            return ResponseEntity.ok(principles);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch principles"));
        }
    }

    /**
     * Get practices for a principle
     * GET /api/governance/principles/{id}/practices
     */
    @GetMapping("/principles/{id}/practices")
    public ResponseEntity<?> getPracticesByPrinciple(@PathVariable Long id) {
        try {
            List<Practice> practices = practiceRepository
                .findByPrinciple_PrincipleIdAndIsActiveTrueOrderByOrderIndexAsc(id);
            return ResponseEntity.ok(practices);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch practices"));
        }
    }

    /**
     * Get criteria for a practice
     * GET /api/governance/practices/{id}/criteria
     */
    @GetMapping("/practices/{id}/criteria")
    public ResponseEntity<?> getCriteriaByPractice(@PathVariable Long id) {
        try {
            List<Criterion> criteria = criterionRepository
                .findByPractice_PracticeIdAndIsActiveTrueOrderByOrderIndexAsc(id);
            return ResponseEntity.ok(criteria);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch criteria"));
        }
    }

    // ===================== ADMIN CRUD =====================

    // ---------- Principles ----------

    @PostMapping("/principles")
    public ResponseEntity<?> createPrinciple(@RequestBody Map<String, Object> body) {
        try {
            Principle p = new Principle();
            p.setName((String) body.get("name"));
            p.setDescription((String) body.getOrDefault("description", ""));
            p.setOrderIndex(body.get("orderIndex") != null ? ((Number) body.get("orderIndex")).intValue() : 0);
            p.setIsActive(true);
            principleRepository.save(p);
            return ResponseEntity.ok(Map.of("principleId", p.getPrincipleId(), "message", "Principle created"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to create principle", "details", e.getMessage()));
        }
    }

    @PutMapping("/principles/{id}")
    public ResponseEntity<?> updatePrinciple(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Principle p = principleRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Principle not found"));
            if (body.containsKey("name")) p.setName((String) body.get("name"));
            if (body.containsKey("description")) p.setDescription((String) body.get("description"));
            if (body.containsKey("orderIndex")) p.setOrderIndex(((Number) body.get("orderIndex")).intValue());
            principleRepository.save(p);
            return ResponseEntity.ok(Map.of("message", "Principle updated"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to update principle"));
        }
    }

    @DeleteMapping("/principles/{id}")
    public ResponseEntity<?> deletePrinciple(@PathVariable Long id) {
        try {
            Principle p = principleRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Principle not found"));
            p.setIsActive(false);
            principleRepository.save(p);
            return ResponseEntity.ok(Map.of("message", "Principle deactivated"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to delete principle"));
        }
    }

    // ---------- Practices ----------

    @PostMapping("/practices")
    public ResponseEntity<?> createPractice(@RequestBody Map<String, Object> body) {
        try {
            Long principleId = ((Number) body.get("principleId")).longValue();
            Principle principle = principleRepository.findById(principleId)
                    .orElseThrow(() -> new RuntimeException("Principle not found"));
            Practice pr = new Practice();
            pr.setPrinciple(principle);
            pr.setName((String) body.get("name"));
            pr.setDescription((String) body.getOrDefault("description", ""));
            pr.setOrderIndex(body.get("orderIndex") != null ? ((Number) body.get("orderIndex")).intValue() : 0);
            pr.setIsActive(true);
            practiceRepository.save(pr);
            return ResponseEntity.ok(Map.of("practiceId", pr.getPracticeId(), "message", "Practice created"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to create practice", "details", e.getMessage()));
        }
    }

    @PutMapping("/practices/{id}")
    public ResponseEntity<?> updatePractice(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Practice pr = practiceRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Practice not found"));
            if (body.containsKey("name")) pr.setName((String) body.get("name"));
            if (body.containsKey("description")) pr.setDescription((String) body.get("description"));
            if (body.containsKey("orderIndex")) pr.setOrderIndex(((Number) body.get("orderIndex")).intValue());
            practiceRepository.save(pr);
            return ResponseEntity.ok(Map.of("message", "Practice updated"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to update practice"));
        }
    }

    @DeleteMapping("/practices/{id}")
    public ResponseEntity<?> deletePractice(@PathVariable Long id) {
        try {
            Practice pr = practiceRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Practice not found"));
            pr.setIsActive(false);
            practiceRepository.save(pr);
            return ResponseEntity.ok(Map.of("message", "Practice deactivated"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to delete practice"));
        }
    }

    // ---------- Criteria ----------

    @PostMapping("/criteria")
    public ResponseEntity<?> createCriterion(@RequestBody Map<String, Object> body) {
        try {
            Long practiceId = ((Number) body.get("practiceId")).longValue();
            Practice practice = practiceRepository.findById(practiceId)
                    .orElseThrow(() -> new RuntimeException("Practice not found"));
            Criterion c = new Criterion();
            c.setPractice(practice);
            c.setDescription((String) body.getOrDefault("description", ""));
            c.setEvidenceText((String) body.getOrDefault("evidenceText", ""));
            c.setReferenceText((String) body.getOrDefault("referenceText", ""));
            c.setOrderIndex(body.get("orderIndex") != null ? ((Number) body.get("orderIndex")).intValue() : 0);
            c.setLevel0Description((String) body.getOrDefault("level0Description", null));
            c.setLevel1Description((String) body.getOrDefault("level1Description", null));
            c.setLevel2Description((String) body.getOrDefault("level2Description", null));
            c.setLevel3Description((String) body.getOrDefault("level3Description", null));
            c.setIsActive(true);
            criterionRepository.save(c);
            return ResponseEntity.ok(Map.of("criterionId", c.getCriterionId(), "message", "Criterion created"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to create criterion", "details", e.getMessage()));
        }
    }

    @PutMapping("/criteria/{id}")
    public ResponseEntity<?> updateCriterion(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Criterion c = criterionRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Criterion not found"));
            if (body.containsKey("description")) c.setDescription((String) body.get("description"));
            if (body.containsKey("evidenceText")) c.setEvidenceText((String) body.get("evidenceText"));
            if (body.containsKey("referenceText")) c.setReferenceText((String) body.get("referenceText"));
            if (body.containsKey("orderIndex")) c.setOrderIndex(((Number) body.get("orderIndex")).intValue());
            if (body.containsKey("level0Description")) c.setLevel0Description((String) body.get("level0Description"));
            if (body.containsKey("level1Description")) c.setLevel1Description((String) body.get("level1Description"));
            if (body.containsKey("level2Description")) c.setLevel2Description((String) body.get("level2Description"));
            if (body.containsKey("level3Description")) c.setLevel3Description((String) body.get("level3Description"));
            criterionRepository.save(c);
            return ResponseEntity.ok(Map.of("message", "Criterion updated"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to update criterion"));
        }
    }

    @DeleteMapping("/criteria/{id}")
    public ResponseEntity<?> deleteCriterion(@PathVariable Long id) {
        try {
            Criterion c = criterionRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Criterion not found"));
            c.setIsActive(false);
            criterionRepository.save(c);
            return ResponseEntity.ok(Map.of("message", "Criterion deactivated"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to delete criterion"));
        }
    }
}