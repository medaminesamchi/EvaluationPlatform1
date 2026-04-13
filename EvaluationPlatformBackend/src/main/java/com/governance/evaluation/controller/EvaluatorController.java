package com.governance.evaluation.controller;

import com.governance.evaluation.entity.*;
import com.governance.evaluation.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/evaluator")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class EvaluatorController {

    private final EvaluationRepository evaluationRepository;
    private final UserRepository userRepository;
    private final EvaluationResultRepository resultRepository;
    private final RecommendationRepository recommendationRepository;
    private final EvaluationResponseRepository responseRepository;
    private final EvaluatorCriterionReviewRepository criterionReviewRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private boolean isEvaluatorOrAdmin(User user) {
        String role = user.getRole().toString();
        return "EVALUATOR".equals(role) || "ADMIN".equals(role);
    }

    // ============================================================
    // GET /api/evaluator/queue
    // Returns all SUBMITTED and PROOF_REQUESTED evaluations
    // ============================================================
    @GetMapping("/queue")
    public ResponseEntity<?> getEvaluationQueue() {
        try {
            User currentUser = getCurrentUser();
            if (!isEvaluatorOrAdmin(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied"));
            }

            List<Evaluation> queue = new ArrayList<>();
            queue.addAll(evaluationRepository.findByStatus(EvaluationStatus.SUBMITTED));
            queue.addAll(evaluationRepository.findByStatus(EvaluationStatus.PROOF_REQUESTED));
            queue.addAll(evaluationRepository.findByStatus(EvaluationStatus.APPROVED));
            queue.addAll(evaluationRepository.findByStatus(EvaluationStatus.REJECTED));

            // Sort by submittedAt descending (newest first)
            queue.sort((e1, e2) -> {
                if (e1.getSubmittedAt() == null && e2.getSubmittedAt() == null) return 0;
                if (e1.getSubmittedAt() == null) return 1;
                if (e2.getSubmittedAt() == null) return -1;
                return e2.getSubmittedAt().compareTo(e1.getSubmittedAt());
            });

            List<Map<String, Object>> response = queue.stream()
                .filter(eval -> eval.getOrganization() != null) // Skip orphaned evaluations
                .map(eval -> {
                Map<String, Object> map = new HashMap<>();
                map.put("evaluationId", eval.getEvaluationId());
                map.put("name", eval.getName());
                map.put("period", eval.getPeriod());
                map.put("status", eval.getStatus().toString());
                map.put("totalScore", eval.getTotalScore());
                map.put("createdAt", eval.getCreatedAt());
                map.put("submittedAt", eval.getSubmittedAt());
                Map<String, Object> org = new HashMap<>();
                org.put("organizationId", eval.getOrganization().getOrganizationId());
                org.put("name", eval.getOrganization().getName());
                org.put("email", eval.getOrganization().getEmail());
                map.put("organization", org);
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch queue"));
        }
    }

    // ============================================================
    // GET /api/evaluator/evaluations/{id}/details
    // Returns full evaluation with responses and existing reviews
    // ============================================================
    @GetMapping("/evaluations/{id}/details")
    public ResponseEntity<?> getEvaluationDetails(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            if (!isEvaluatorOrAdmin(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied"));
            }

            Evaluation evaluation = evaluationRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Evaluation not found"));

            List<EvaluationResponse> responses = responseRepository
                    .findByEvaluation_EvaluationId(id);

            List<EvaluatorCriterionReview> existingReviews = criterionReviewRepository
                    .findByEvaluation_EvaluationId(id);

            Map<String, Object> result = new HashMap<>();
            result.put("evaluationId", evaluation.getEvaluationId());
            result.put("name", evaluation.getName());
            result.put("period", evaluation.getPeriod());
            result.put("status", evaluation.getStatus().toString());
            result.put("totalScore", evaluation.getTotalScore());

            Map<String, Object> org = new HashMap<>();
            org.put("name", evaluation.getOrganization().getName());
            org.put("email", evaluation.getOrganization().getEmail());
            result.put("organization", org);

            // Map responses
            List<Map<String, Object>> responseDTOs = responses.stream().map(r -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("responseId", r.getResponseId());
                dto.put("principleId", r.getPrincipleId());
                dto.put("practiceId", r.getPracticeId());
                dto.put("criterionId", r.getCriterionId());
                dto.put("maturityLevel", r.getMaturityLevel());
                dto.put("comments", r.getComments());
                dto.put("evidence", r.getEvidence());
                dto.put("evidenceFiles", r.getEvidenceFiles() != null && !r.getEvidenceFiles().isEmpty()
                        ? Arrays.asList(r.getEvidenceFiles().split(",")) : List.of());
                return dto;
            }).collect(Collectors.toList());
            result.put("responses", responseDTOs);

            // Map existing criterion reviews
            List<Map<String, Object>> reviewDTOs = existingReviews.stream().map(r -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("reviewId", r.getReviewId());
                dto.put("principleId", r.getPrincipleId());
                dto.put("practiceId", r.getPracticeId());
                dto.put("criterionId", r.getCriterionId());
                dto.put("adjustedMaturityLevel", r.getAdjustedMaturityLevel());
                dto.put("adjustmentReason", r.getAdjustmentReason());
                dto.put("proofRequested", r.getProofRequested());
                dto.put("proofRequestComment", r.getProofRequestComment());
                dto.put("rejectedFiles", r.getRejectedFiles());
                return dto;
            }).collect(Collectors.toList());
            result.put("criterionReviews", reviewDTOs);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch details", "details", e.getMessage()));
        }
    }

    // ============================================================
    // GET /api/evaluator/evaluations/{id}/file/{filename}
    // Serve evidence file inline (no download)
    // ============================================================
    @GetMapping("/evaluations/{id}/file/{filename}")
    public ResponseEntity<?> viewEvidenceFile(
            @PathVariable Long id,
            @PathVariable String filename) {
        try {
            User currentUser = getCurrentUser();
            if (!isEvaluatorOrAdmin(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Path filePath = Paths.get("uploads").toAbsolutePath()
                    .resolve(id.toString()).resolve(filename);
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            // Determine content type for inline display
            String contentType = "application/octet-stream";
            String lower = filename.toLowerCase();
            if (lower.endsWith(".pdf"))  contentType = "application/pdf";
            else if (lower.endsWith(".png"))  contentType = "image/png";
            else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (lower.endsWith(".gif"))  contentType = "image/gif";
            else if (lower.endsWith(".webp")) contentType = "image/webp";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    // inline = display in browser, not download
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ============================================================
    // POST /api/evaluator/evaluations/{id}/approve
    // Approve with optional per-criterion score adjustments
    // ============================================================
    @PostMapping("/evaluations/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveEvaluation(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> request) {
        try {
            User currentUser = getCurrentUser();
            if (!isEvaluatorOrAdmin(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied"));
            }

            Evaluation evaluation = evaluationRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Evaluation not found"));

            // Save criterion reviews if provided
            if (request != null && request.containsKey("criterionReviews")) {
                saveCriterionReviews(evaluation, currentUser, request);
            }

            evaluation.setStatus(EvaluationStatus.APPROVED);
            evaluation.setApprovedAt(LocalDateTime.now());
            evaluationRepository.save(evaluation);

            // Generate result using effective scores (adjusted if evaluator changed them)
            generateEvaluationResult(evaluation);
            generateRecommendations(evaluation);

            return ResponseEntity.ok(Map.of(
                    "message", "Evaluation approved",
                    "evaluationId", evaluation.getEvaluationId()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to approve", "details", e.getMessage()));
        }
    }

    // ============================================================
    // POST /api/evaluator/evaluations/{id}/reject
    // ============================================================
    @PostMapping("/evaluations/{id}/reject")
    public ResponseEntity<?> rejectEvaluation(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            User currentUser = getCurrentUser();
            if (!isEvaluatorOrAdmin(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied"));
            }

            Evaluation evaluation = evaluationRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Evaluation not found"));

            evaluation.setStatus(EvaluationStatus.REJECTED);
            evaluationRepository.save(evaluation);

            return ResponseEntity.ok(Map.of(
                    "message", "Evaluation rejected",
                    "reason", request.getOrDefault("reason", "Not specified")
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to reject"));
        }
    }

    // ============================================================
    // POST /api/evaluator/evaluations/{id}/request-proof
    // Request additional proof for specific criteria
    // Body: { reason: string, criterionReviews: [{principleId, practiceId, criterionId, proofRequestComment}] }
    // ============================================================
    @PostMapping("/evaluations/{id}/request-proof")
    public ResponseEntity<?> requestProof(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        try {
            User currentUser = getCurrentUser();
            if (!isEvaluatorOrAdmin(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied"));
            }

            Evaluation evaluation = evaluationRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Evaluation not found"));

            // Save criterion reviews with proof_requested = true
            saveCriterionReviews(evaluation, currentUser, request);

            evaluation.setStatus(EvaluationStatus.PROOF_REQUESTED);
            evaluationRepository.save(evaluation);

            return ResponseEntity.ok(Map.of(
                    "message", "Proof requested for specific criteria",
                    "evaluationId", evaluation.getEvaluationId()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to request proof", "details", e.getMessage()));
        }
    }

    // ============================================================
    // Helper: Save criterion-level reviews
    // ============================================================
    @SuppressWarnings("unchecked")
    private void saveCriterionReviews(Evaluation evaluation, User evaluator, Map<String, Object> request) {
        List<Map<String, Object>> reviews = (List<Map<String, Object>>) request.get("criterionReviews");
        if (reviews == null) return;

        for (Map<String, Object> r : reviews) {
            Long principleId = toLong(r.get("principleId"));
            Long practiceId  = toLong(r.get("practiceId"));
            Long criterionId = toLong(r.get("criterionId"));

            // Find existing or create new
            EvaluatorCriterionReview review = criterionReviewRepository
                    .findByEvaluation_EvaluationId(evaluation.getEvaluationId())
                    .stream()
                    .filter(cr -> cr.getCriterionId().equals(criterionId)
                            && cr.getPrincipleId().equals(principleId)
                            && cr.getPracticeId().equals(practiceId))
                    .findFirst()
                    .orElse(new EvaluatorCriterionReview());

            review.setEvaluation(evaluation);
            review.setEvaluator(evaluator);
            review.setPrincipleId(principleId);
            review.setPracticeId(practiceId);
            review.setCriterionId(criterionId);
            review.setCreatedAt(LocalDateTime.now());

            if (r.get("adjustedMaturityLevel") != null) {
                review.setAdjustedMaturityLevel(toInt(r.get("adjustedMaturityLevel")));
                review.setAdjustmentReason((String) r.get("adjustmentReason"));
            }

            Boolean proofRequested = (Boolean) r.get("proofRequested");
            review.setProofRequested(proofRequested != null && proofRequested);
            if (r.get("proofRequestComment") != null) {
                review.setProofRequestComment((String) r.get("proofRequestComment"));
            }
            if (r.get("rejectedFiles") != null) {
                // frontend sends JSON string or object, we store as JSON string
                Object rf = r.get("rejectedFiles");
                if (rf instanceof String) {
                    review.setRejectedFiles((String) rf);
                } else {
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        review.setRejectedFiles(mapper.writeValueAsString(rf));
                    } catch (Exception e) {
                        review.setRejectedFiles("[]");
                    }
                }
            } else {
                review.setRejectedFiles(null);
            }

            criterionReviewRepository.save(review);
        }
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Integer) return ((Integer) val).longValue();
        if (val instanceof Long) return (Long) val;
        return Long.parseLong(val.toString());
    }

    private Integer toInt(Object val) {
        if (val == null) return null;
        if (val instanceof Integer) return (Integer) val;
        return Integer.parseInt(val.toString());
    }

    // ============================================================
    // Helper: Generate evaluation result using effective scores
    // (uses evaluator adjusted levels if available)
    // ============================================================
    private void generateEvaluationResult(Evaluation evaluation) {
        Optional<EvaluationResult> existing = resultRepository
                .findByEvaluation_EvaluationId(evaluation.getEvaluationId());
        if (existing.isPresent()) {
            resultRepository.delete(existing.get());
            resultRepository.flush();
        }

        List<EvaluationResponse> responses = responseRepository
                .findByEvaluation_EvaluationId(evaluation.getEvaluationId());

        List<EvaluatorCriterionReview> reviews = criterionReviewRepository
                .findByEvaluation_EvaluationId(evaluation.getEvaluationId());

        Map<String, Integer> adjustments = new HashMap<>();
        for (EvaluatorCriterionReview r : reviews) {
            if (r.getAdjustedMaturityLevel() != null) {
                adjustments.put(r.getPrincipleId() + "-" + r.getPracticeId() + "-" + r.getCriterionId(),
                        r.getAdjustedMaturityLevel());
            }
        }

        if (responses.isEmpty()) return;

        double sum = 0;
        for (EvaluationResponse r : responses) {
            String key = r.getPrincipleId() + "-" + r.getPracticeId() + "-" + r.getCriterionId();
            int level = adjustments.getOrDefault(key,
                    r.getMaturityLevel() != null ? r.getMaturityLevel() : 0);
            sum += level;
        }

        double score = (sum / (responses.size() * 3.0)) * 100.0;

        EvaluationResult result = new EvaluationResult();
        result.setEvaluation(evaluation);
        result.setTotalScore(score);
        result.setFinalScore(score);
        result.setIssuedDate(LocalDateTime.now());
        result.setExpiryDate(LocalDateTime.now().plusYears(1));
        result.setCreatedAt(LocalDateTime.now());

        if (score >= 90)      result.setCertificationLevel(CertificationLevel.PLATINUM);
        else if (score >= 80) result.setCertificationLevel(CertificationLevel.GOLD);
        else if (score >= 65) result.setCertificationLevel(CertificationLevel.SILVER);
        else if (score >= 50) result.setCertificationLevel(CertificationLevel.BRONZE);
        else                  result.setCertificationLevel(CertificationLevel.NOT_CERTIFIED);

        resultRepository.save(result);
        evaluation.setTotalScore(score);
        evaluationRepository.save(evaluation);
    }

    private void generateRecommendations(Evaluation evaluation) {
        recommendationRepository.deleteByEvaluation_EvaluationId(evaluation.getEvaluationId());
        List<EvaluationResponse> responses = responseRepository
                .findByEvaluation_EvaluationId(evaluation.getEvaluationId());

        List<EvaluatorCriterionReview> reviews = criterionReviewRepository
                .findByEvaluation_EvaluationId(evaluation.getEvaluationId());

        Map<String, Integer> adjustments = new HashMap<>();
        for (EvaluatorCriterionReview r : reviews) {
            if (r.getAdjustedMaturityLevel() != null) {
                adjustments.put(r.getPrincipleId() + "-" + r.getPracticeId() + "-" + r.getCriterionId(),
                        r.getAdjustedMaturityLevel());
            }
        }

        for (EvaluationResponse r : responses) {
            String key = r.getPrincipleId() + "-" + r.getPracticeId() + "-" + r.getCriterionId();
            int level = adjustments.getOrDefault(key,
                    r.getMaturityLevel() != null ? r.getMaturityLevel() : 0);

            if (level < 3) {
                Recommendation rec = new Recommendation();
                rec.setEvaluation(evaluation);
                rec.setPrincipleId(r.getPrincipleId());
                rec.setPracticeId(r.getPracticeId());
                rec.setCriterionId(r.getCriterionId());
                rec.setCurrentMaturityLevel(level);
                rec.setTargetMaturityLevel(Math.min(level + 1, 3));
                rec.setRecommendation("Improve governance practice to reach maturity level " + (level + 1));
                rec.setActionPlan("1. Review current state\n2. Define improvement plan\n3. Implement changes\n4. Monitor progress");
                rec.setPriority(level == 0 ? RecommendationPriority.CRITICAL
                        : level == 1 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM);
                rec.setCreatedAt(LocalDateTime.now());
                recommendationRepository.save(rec);
            }
        }
    }
}