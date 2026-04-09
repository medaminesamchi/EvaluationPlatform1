package com.governance.evaluation.repository;

import com.governance.evaluation.entity.EvaluatorCriterionReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EvaluatorCriterionReviewRepository extends JpaRepository<EvaluatorCriterionReview, Long> {
    List<EvaluatorCriterionReview> findByEvaluation_EvaluationId(Long evaluationId);
    void deleteByEvaluation_EvaluationId(Long evaluationId);
}