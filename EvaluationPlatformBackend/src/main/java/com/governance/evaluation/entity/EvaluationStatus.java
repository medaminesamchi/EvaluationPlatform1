package com.governance.evaluation.entity;

public enum EvaluationStatus {
    CREATED,
    IN_PROGRESS,
    SUBMITTED,
    PROOF_REQUESTED,  // Evaluator requested additional proof for specific criteria
    APPROVED,

    REJECTED
}