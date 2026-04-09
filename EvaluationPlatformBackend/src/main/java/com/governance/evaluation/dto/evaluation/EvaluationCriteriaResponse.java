package com.governance.evaluation.dto.evaluation;

import lombok.Data;
import java.util.List;

@Data
public class EvaluationCriteriaResponse {
    private Long criteriaId;
    private Double score;
    private Integer maturityLevel;
    private String evidence;
    private String comment;
    private String fileUrl;
}
