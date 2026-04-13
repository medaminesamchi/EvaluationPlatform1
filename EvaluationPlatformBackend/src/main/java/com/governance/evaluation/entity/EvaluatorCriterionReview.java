package com.governance.evaluation.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluator_criterion_reviews")
@Data
public class EvaluatorCriterionReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long reviewId;

    @ManyToOne
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @Column(name = "principle_id")
    private Long principleId;

    @Column(name = "practice_id")
    private Long practiceId;

    @Column(name = "criterion_id")
    private Long criterionId;

    // Evaluator's adjusted maturity level (overrides org's)
    @Column(name = "adjusted_maturity_level")
    private Integer adjustedMaturityLevel;

    // Reason for adjustment (mandatory if adjusted)
    @Column(name = "adjustment_reason", columnDefinition = "TEXT")
    private String adjustmentReason;

    // Whether evaluator is requesting proof for this criterion
    @Column(name = "proof_requested")
    private Boolean proofRequested = false;

    // Comment explaining what proof is needed
    @Column(name = "proof_request_comment", columnDefinition = "TEXT")
    private String proofRequestComment;

    // JSON string storing rejected files and their reasons
    @Column(name = "rejected_files", columnDefinition = "TEXT")
    private String rejectedFiles;

    @ManyToOne
    @JoinColumn(name = "evaluator_id")
    private User evaluator;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}