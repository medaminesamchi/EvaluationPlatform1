package com.governance.evaluation.dto.evaluation;

import lombok.Data;

@Data
public class EvaluationResponseDTO {
    private Long responseId;
    private Long principleId;
    private Long practiceId;
    private Long criterionId;
    private Integer maturityLevel;
    private String evidence;
    private String comments;
    private String evidenceFiles;
}
