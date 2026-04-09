package com.governance.evaluation.controller;

import com.governance.evaluation.entity.*;
import com.governance.evaluation.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired private UserRepository userRepository;
    @Autowired private EvaluationRepository evaluationRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EvaluationResultRepository resultRepository;
    @Autowired private EvaluationResponseRepository responseRepository;
    @Autowired private RecommendationRepository recommendationRepository;

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<User> allUsers = userRepository.findAll();
            List<Map<String, Object>> dtos = allUsers.stream().map(user -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("userId", user.getUserId());
                dto.put("name", user.getName());
                dto.put("email", user.getEmail());
                dto.put("role", user.getRole());
                dto.put("active", user.getIsActive());
                return dto;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to fetch users"));
        }
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");
            String name = request.get("name");
            String role = request.get("role");
            if (userRepository.existsByEmail(email))
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Email already exists"));
            User user;
            switch (role.toUpperCase()) {
                case "ORGANIZATION": user = new Organization(); break;
                case "EVALUATOR":    user = new Evaluator();    break;
                case "ADMIN":        user = new Administrator(); break;
                default: return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
            }
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setName(name);
            user.setIsActive(true);
            userRepository.save(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "User created successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to create user"));
        }
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        try {
            Optional<User> userOpt = userRepository.findById(id);
            if (!userOpt.isPresent()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
            User user = userOpt.get();
            if (updates.containsKey("name"))   user.setName((String) updates.get("name"));
            if (updates.containsKey("email"))  user.setEmail((String) updates.get("email"));
            if (updates.containsKey("password")) {
                String pwd = (String) updates.get("password");
                if (pwd != null && !pwd.isEmpty()) user.setPassword(passwordEncoder.encode(pwd));
            }
            if (updates.containsKey("active")) user.setIsActive((Boolean) updates.get("active"));
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "User updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to update user"));
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            User user = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            if (user.getRole().equals(UserRole.ORGANIZATION)) {
                List<Evaluation> evaluations = evaluationRepository.findByOrganization_UserId(id);
                if (!evaluations.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("error", "Cannot delete user with existing evaluations"));
                }
            }
            userRepository.delete(user);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to delete user"));
        }
    }

    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) {
        try {
            Optional<User> userOpt = userRepository.findById(id);
            if (!userOpt.isPresent()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
            User user = userOpt.get();
            user.setIsActive(!user.getIsActive());
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "User status updated", "active", user.getIsActive()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to toggle status"));
        }
    }

    @GetMapping("/evaluations")
    @Transactional
    public ResponseEntity<?> getAllEvaluations() {
        try {
            List<Evaluation> evaluations = evaluationRepository.findAll();
            List<Map<String, Object>> dtos = evaluations.stream().map(eval -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("evaluationId", eval.getEvaluationId());
                dto.put("name", eval.getName());
                dto.put("description", eval.getDescription());
                dto.put("period", eval.getPeriod());
                dto.put("status", eval.getStatus().toString());
                dto.put("totalScore", eval.getTotalScore());
                dto.put("createdAt", eval.getCreatedAt());
                if (eval.getOrganization() != null) {
                    dto.put("organizationId", eval.getOrganization().getUserId());
                    dto.put("organizationName", eval.getOrganization().getName());
                }
                return dto;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to fetch evaluations"));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats() {
        try {
            long totalUsers = userRepository.count();
            long totalOrganizations = userRepository.findAll().stream().filter(u -> u instanceof Organization).count();
            long totalEvaluations = evaluationRepository.count();
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalUsers", totalUsers);
            stats.put("totalOrganizations", totalOrganizations);
            stats.put("totalEvaluations", totalEvaluations);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to get stats"));
        }
    }

    @PostMapping("/evaluations/{id}/approve")
    public ResponseEntity<?> approveEvaluation(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            Evaluation evaluation = evaluationRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Evaluation not found"));
            evaluation.setStatus(EvaluationStatus.APPROVED);
            evaluationRepository.save(evaluation);
            generateEvaluationResult(evaluation);
            generateRecommendations(evaluation);
            return ResponseEntity.ok(Map.of("message", "Evaluation approved successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to approve evaluation"));
        }
    }

    @PostMapping("/evaluations/{id}/reject")
    public ResponseEntity<?> rejectEvaluation(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            Evaluation evaluation = evaluationRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Evaluation not found"));
            evaluation.setStatus(EvaluationStatus.REJECTED);
            evaluationRepository.save(evaluation);
            return ResponseEntity.ok(Map.of("message", "Evaluation rejected"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to reject evaluation"));
        }
    }

    private void generateEvaluationResult(Evaluation evaluation) {
        Optional<EvaluationResult> existing = resultRepository.findByEvaluation_EvaluationId(evaluation.getEvaluationId());
        if (existing.isPresent()) return;
        Double score = evaluation.getTotalScore() != null ? evaluation.getTotalScore() : 0.0;
        EvaluationResult result = new EvaluationResult();
        result.setEvaluation(evaluation);
        result.setTotalScore(score);
        if (score >= 90)      result.setCertificationLevel(CertificationLevel.PLATINUM);
        else if (score >= 80) result.setCertificationLevel(CertificationLevel.GOLD);
        else if (score >= 65) result.setCertificationLevel(CertificationLevel.SILVER);
        else if (score >= 50) result.setCertificationLevel(CertificationLevel.BRONZE);
        else                  result.setCertificationLevel(CertificationLevel.NOT_CERTIFIED);
        result.setIssuedDate(LocalDateTime.now());
        result.setExpiryDate(LocalDateTime.now().plusYears(2));
        result.setCreatedAt(LocalDateTime.now());
        resultRepository.save(result);
    }

    private void generateRecommendations(Evaluation evaluation) {
        recommendationRepository.deleteByEvaluation_EvaluationId(evaluation.getEvaluationId());
        List<EvaluationResponse> responses = responseRepository.findByEvaluation_EvaluationId(evaluation.getEvaluationId());
        for (EvaluationResponse response : responses) {
            Integer level = response.getMaturityLevel() != null ? response.getMaturityLevel() : 0;
            if (level < 3) {
                Recommendation rec = new Recommendation();
                rec.setEvaluation(evaluation);
                rec.setPrincipleId(response.getPrincipleId());
                rec.setPracticeId(response.getPracticeId());
                rec.setCriterionId(response.getCriterionId());
                rec.setCurrentMaturityLevel(level);
                rec.setTargetMaturityLevel(Math.min(level + 1, 3));
                rec.setRecommendation("Improve this area to reach maturity level " + (level + 1));
                rec.setActionPlan("1. Review current state\n2. Define improvement actions\n3. Implement changes\n4. Monitor progress");
                rec.setPriority(level == 0 ? RecommendationPriority.CRITICAL : RecommendationPriority.HIGH);
                rec.setCreatedAt(LocalDateTime.now());
                recommendationRepository.save(rec);
            }
        }
    }
}