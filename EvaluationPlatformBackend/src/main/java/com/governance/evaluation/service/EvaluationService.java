package com.governance.evaluation.service;

import com.governance.evaluation.entity.*;
import com.governance.evaluation.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final EvaluationResponseRepository responseRepository;
    private final EvaluationResultRepository resultRepository;
    private final RecommendationRepository recommendationRepository;

    @Transactional(readOnly = true)
    public Optional<Evaluation> findById(Long id) {
        return evaluationRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<Evaluation> findAll() {
        return evaluationRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Evaluation> findByOrganizationId(Long organizationId) {
        return evaluationRepository.findByOrganization_UserId(organizationId);
    }

    @Transactional(readOnly = true)
    public List<Evaluation> findByStatus(EvaluationStatus status) {
        return evaluationRepository.findByStatus(status);
    }

    @Transactional
    public Evaluation save(Evaluation evaluation) {
        return evaluationRepository.save(evaluation);
    }

    @Transactional
    public Evaluation create(Evaluation evaluation) {
        evaluation.setStatus(EvaluationStatus.CREATED);
        evaluation.setTotalScore(0.0);
        evaluation.setCreatedAt(LocalDateTime.now());
        return evaluationRepository.save(evaluation);
    }

    @Transactional
    public Evaluation update(Evaluation evaluation) {
        return evaluationRepository.save(evaluation);
    }

    @Transactional
    public Evaluation submit(Long evaluationId) {
        Evaluation evaluation = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new RuntimeException("Evaluation not found"));

        if (evaluation.getStatus() != EvaluationStatus.CREATED &&
                evaluation.getStatus() != EvaluationStatus.IN_PROGRESS) {
            throw new IllegalStateException("Evaluation already submitted");
        }

        Double totalScore = calculateTotalScore(evaluationId);
        evaluation.setStatus(EvaluationStatus.SUBMITTED);
        evaluation.setSubmittedAt(LocalDateTime.now());
        evaluation.setTotalScore(totalScore);
        return evaluationRepository.save(evaluation);
    }

    @Transactional
    public Evaluation approve(Long evaluationId) {
        Evaluation evaluation = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new RuntimeException("Evaluation not found"));
        evaluation.setStatus(EvaluationStatus.APPROVED);
        Evaluation approved = evaluationRepository.save(evaluation);
        generateEvaluationResult(evaluation);
        generateRecommendations(evaluation);
        return approved;
    }

    @Transactional
    public Evaluation reject(Long evaluationId) {
        Evaluation evaluation = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new RuntimeException("Evaluation not found"));
        evaluation.setStatus(EvaluationStatus.REJECTED);
        return evaluationRepository.save(evaluation);
    }

    @Transactional
    public void delete(Long id) {
        Evaluation evaluation = evaluationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation not found"));
        if (evaluation.getStatus() != EvaluationStatus.CREATED) {
            throw new IllegalStateException("Cannot delete submitted evaluation");
        }
        evaluationRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Double calculateTotalScore(Long evaluationId) {
        List<EvaluationResponse> responses = responseRepository.findByEvaluation_EvaluationId(evaluationId);
        if (responses.isEmpty()) return 0.0;
        double sum = responses.stream()
                .mapToDouble(r -> r.getMaturityLevel() != null ? r.getMaturityLevel() : 0.0)
                .sum();
        double maxPossible = responses.size() * 3.0;
        return (sum / maxPossible) * 100.0;
    }

    @Transactional
    public void generateEvaluationResult(Evaluation evaluation) {
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

    @Transactional
    public void generateRecommendations(Evaluation evaluation) {
        recommendationRepository.deleteByEvaluation_EvaluationId(evaluation.getEvaluationId());
        List<EvaluationResponse> responses = responseRepository.findByEvaluation_EvaluationId(evaluation.getEvaluationId());

        for (EvaluationResponse response : responses) {
            Integer maturityLevel = response.getMaturityLevel() != null ? response.getMaturityLevel() : 0;
            if (maturityLevel < 3) {
                Recommendation rec = new Recommendation();
                rec.setEvaluation(evaluation);
                rec.setPrincipleId(response.getPrincipleId());
                rec.setPracticeId(response.getPracticeId());
                rec.setCriterionId(response.getCriterionId());
                rec.setCurrentMaturityLevel(maturityLevel);
                rec.setTargetMaturityLevel(Math.min(maturityLevel + 1, 3));
                rec.setRecommendation(generateRecommendationText(maturityLevel));
                rec.setActionPlan(generateActionPlan(maturityLevel));
                if (maturityLevel == 0)      rec.setPriority(RecommendationPriority.CRITICAL);
                else if (maturityLevel == 1) rec.setPriority(RecommendationPriority.HIGH);
                else                         rec.setPriority(RecommendationPriority.MEDIUM);
                rec.setCreatedAt(LocalDateTime.now());
                recommendationRepository.save(rec);
            }
        }
    }

    private String generateRecommendationText(Integer level) {
        switch (level) {
            case 0: return "CRITICAL: Establish foundational framework. Document current processes and create implementation plan.";
            case 1: return "HIGH PRIORITY: Complete implementation, conduct training, establish monitoring mechanisms.";
            case 2: return "OPTIMIZATION: Conduct audits, gather feedback, implement continuous improvement cycles.";
            default: return "Maintain current excellence level.";
        }
    }

    private String generateActionPlan(Integer level) {
        switch (level) {
            case 0: return "1. Establish basic framework\n2. Document initial procedures\n3. Assign responsibilities\n4. Implement monitoring";
            case 1: return "1. Formalize existing processes\n2. Enhance documentation\n3. Implement regular reviews\n4. Establish metrics";
            default: return "1. Complete remaining gaps\n2. Enhance monitoring\n3. Implement continuous improvement\n4. Document best practices";
        }
    }
}