package com.governance.evaluation.repository;

import com.governance.evaluation.entity.Recommendation;
import com.governance.evaluation.entity.RecommendationPriority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {
    List<Recommendation> findByEvaluation_EvaluationId(Long evaluationId);
    List<Recommendation> findByEvaluation_EvaluationIdAndPriority(Long evaluationId, RecommendationPriority priority);
    void deleteByEvaluation_EvaluationId(Long evaluationId);
}