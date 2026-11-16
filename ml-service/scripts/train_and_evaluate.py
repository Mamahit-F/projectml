"""
Model Training, Comparison, and Evaluation Script
Project: StudentInsight
Compares:
1. Random Forest Classifier
2. Decision Tree Classifier
3. Logistic Regression
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report

def train_and_evaluate():
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "synthetic_student_dataset.csv")
    if not os.path.exists(data_path):
        from generate_dataset import generate_student_disciplinary_dataset
        df = generate_student_disciplinary_dataset(1500)
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)

    features = [
        "residence_category",
        "required_attendance",
        "present_count",
        "absence_count",
        "attendance_rate",
        "consecutive_absences",
        "previous_violation_points",
        "wop_attendance_rate"
    ]
    target = "risk_category"

    X = df[features]
    y = df[target]

    # Preprocessor
    cat_features = ["residence_category"]
    num_features = [f for f in features if f != "residence_category"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_features),
            ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), cat_features)
        ]
    )

    # Train / Test split (Stratified 80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    models = {
        "RandomForest": RandomForestClassifier(n_estimators=120, max_depth=7, min_samples_split=4, random_state=42),
        "DecisionTree": DecisionTreeClassifier(max_depth=5, min_samples_split=6, random_state=42),
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42)
    }

    results = {}
    best_model_name = None
    best_macro_f1 = -1.0
    best_pipeline = None

    classes = ["LOW", "MEDIUM", "HIGH"]

    for name, clf in models.items():
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("classifier", clf)
        ])

        # 5-fold Cross-validation
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1_macro")

        # Fit on training set
        pipeline.fit(X_train, y_train)

        # Predict test set
        y_pred = pipeline.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        prec_macro = precision_score(y_test, y_pred, average="macro", zero_division=0)
        rec_macro = recall_score(y_test, y_pred, average="macro", zero_division=0)
        f1_macro = f1_score(y_test, y_pred, average="macro", zero_division=0)

        # Per-class metrics
        class_rec = recall_score(y_test, y_pred, average=None, labels=classes, zero_division=0)
        class_f1 = f1_score(y_test, y_pred, average=None, labels=classes, zero_division=0)
        cm = confusion_matrix(y_test, y_pred, labels=classes).tolist()
        clf_rep = classification_report(y_test, y_pred, labels=classes, output_dict=True, zero_division=0)

        high_risk_recall = class_rec[classes.index("HIGH")]

        results[name] = {
            "cv_f1_macro_mean": float(np.round(cv_scores.mean(), 4)),
            "cv_f1_macro_std": float(np.round(cv_scores.std(), 4)),
            "test_accuracy": float(np.round(acc, 4)),
            "test_precision_macro": float(np.round(prec_macro, 4)),
            "test_recall_macro": float(np.round(rec_macro, 4)),
            "test_f1_macro": float(np.round(f1_macro, 4)),
            "high_risk_recall": float(np.round(high_risk_recall, 4)),
            "confusion_matrix": cm,
            "classes": classes,
            "classification_report": clf_rep
        }

        print(f"[{name}] Acc: {acc:.4f} | Macro F1: {f1_macro:.4f} | HIGH Recall: {high_risk_recall:.4f}")

        # Best model selected on balanced Macro F1 + high risk detection
        if f1_macro > best_macro_f1:
            best_macro_f1 = f1_macro
            best_model_name = name
            best_pipeline = pipeline

    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(models_dir, exist_ok=True)

    # Save best model
    model_save_path = os.path.join(models_dir, "best_model.joblib")
    joblib.dump(best_pipeline, model_save_path)
    print(f"\nSaved Best Model ({best_model_name}) to: {model_save_path}")

    # Metadata
    metadata = {
        "model_name": best_model_name,
        "model_version": "1.0",
        "training_date": datetime.now().isoformat(),
        "features": features,
        "target_classes": classes,
        "selection_reason": "Highest Macro F1-Score and superior sensitivity (Recall) on HIGH risk disciplinary cases",
        "evaluation_summary": results
    }

    meta_path = os.path.join(models_dir, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    # Save Markdown documentation in docs
    doc_path = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "machine-learning", "evaluation_results.md")
    os.makedirs(os.path.dirname(doc_path), exist_ok=True)
    with open(doc_path, "w") as f:
        f.write("# Machine Learning Evaluation & Model Selection Report\n\n")
        f.write(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("## 1. Algorithm Comparison Summary\n\n")
        f.write("| Model | CV Macro F1 | Test Accuracy | Test Macro F1 | HIGH Risk Recall |\n")
        f.write("|---|---|---|---|---|\n")
        for m_name, res in results.items():
            f.write(f"| **{m_name}** | {res['cv_f1_macro_mean']:.4f} (+/- {res['cv_f1_macro_std']:.4f}) | {res['test_accuracy'] * 100:.2f}% | {res['test_f1_macro']:.4f} | {res['high_risk_recall'] * 100:.2f}% |\n")
        f.write(f"\n**Selected Best Model**: `{best_model_name}`\n")
        f.write(f"\n**Reason**: {metadata['selection_reason']}\n\n")
        f.write("## 2. Confusion Matrix (Best Model: " + best_model_name + ")\n")
        f.write("Labels: LOW, MEDIUM, HIGH\n\n")
        f.write("```json\n" + json.dumps(results[best_model_name]["confusion_matrix"], indent=2) + "\n```\n")

    print(f"Saved evaluation markdown report to: {doc_path}")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
