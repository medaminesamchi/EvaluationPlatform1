package com.governance.evaluation.dto.evaluation;

import lombok.Data;

@Data
public class EvaluationUpdateRequest {
    private String name;
    private String period;
    private String description;
}
