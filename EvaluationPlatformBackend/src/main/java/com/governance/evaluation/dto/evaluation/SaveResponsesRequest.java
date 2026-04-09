package com.governance.evaluation.dto.evaluation;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class SaveResponsesRequest {
    private List<Map<String, Object>> responses;
}
