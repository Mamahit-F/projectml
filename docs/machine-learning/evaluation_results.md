# Machine Learning Evaluation & Model Selection Report

Generated at: 2026-11-04 00:56:55

## 1. Algorithm Comparison Summary

| Model | CV Macro F1 | Test Accuracy | Test Macro F1 | HIGH Risk Recall |
|---|---|---|---|---|
| **RandomForest** | 0.7242 (+/- 0.0244) | 76.67% | 0.7179 | 73.68% |
| **DecisionTree** | 0.7143 (+/- 0.0341) | 74.67% | 0.6893 | 73.68% |
| **LogisticRegression** | 0.6763 (+/- 0.0449) | 75.33% | 0.6895 | 68.42% |

**Selected Best Model**: `RandomForest`

**Reason**: Highest Macro F1-Score and superior sensitivity (Recall) on HIGH risk disciplinary cases

## 2. Confusion Matrix (Best Model: RandomForest)
Labels: LOW, MEDIUM, HIGH

```json
[
  [
    153,
    31,
    0
  ],
  [
    15,
    49,
    14
  ],
  [
    1,
    9,
    28
  ]
]
```
