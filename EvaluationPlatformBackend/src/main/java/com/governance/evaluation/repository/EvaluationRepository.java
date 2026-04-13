package com.governance.evaluation.repository;

import com.governance.evaluation.entity.Evaluation;
import com.governance.evaluation.entity.EvaluationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
    
    // Find evaluations by organization ID
    List<Evaluation> findByOrganization_OrganizationId(Long organizationId);
    
    // Find evaluations by status
    List<Evaluation> findByStatus(EvaluationStatus status);
    
    // Find evaluations by organization and status
    List<Evaluation> findByOrganization_OrganizationIdAndStatus(Long organizationId, EvaluationStatus status);
}