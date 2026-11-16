"""
Realistic Synthetic Dataset Generator for Student Disciplinary Risk Prediction
Project: StudentInsight
University: Universitas Klabat (UNKLAB)

LEAKAGE PREVENTION:
- Features are calculated from an OBSERVATION WINDOW (Weeks 1 to 4).
- The target label `risk_category` (LOW, MEDIUM, HIGH) is computed strictly from the OUTCOME WINDOW (Weeks 5 to 8).
- Denominators for required attendance differ realistically between OUTSIDER_DEKAT and OUTSIDER_JAUH.
"""

import numpy as np
import pandas as pd
import os

def generate_student_disciplinary_dataset(n_students=1200, random_state=42):
    np.random.seed(random_state)
    records = []

    for s_idx in range(1, n_students + 1):
        # 1. Residence Category: ~60% Outsider Dekat, ~40% Outsider Jauh
        is_dekat = np.random.rand() < 0.60
        residence = "OUTSIDER_DEKAT" if is_dekat else "OUTSIDER_JAUH"

        # 2. Base student conscientiousness profile (latent trait: high, moderate, low discipline)
        trait = np.random.choice(["conscientious", "average", "struggling"], p=[0.55, 0.30, 0.15])

        # 3. Observation Window (Weeks 1-4)
        # Required attendance:
        # Outsider Dekat: ~24 events (Friday Vesper + Sabbath Morning + Sabbath Afternoon + WOP Morning + WOP Evening)
        # Outsider Jauh: ~12 events (Sabbath Morning + WOP Morning)
        if is_dekat:
            obs_required = np.random.randint(22, 26)
            wop_required = np.random.randint(8, 12)
        else:
            obs_required = np.random.randint(10, 14)
            wop_required = np.random.randint(4, 6)

        if trait == "conscientious":
            present_rate = np.random.uniform(0.85, 1.0)
            consecutive_abs = np.random.choice([0, 1], p=[0.9, 0.1])
            prev_points = np.random.choice([0, 5], p=[0.85, 0.15])
            wop_rate = np.random.uniform(0.80, 1.0)
        elif trait == "average":
            present_rate = np.random.uniform(0.65, 0.85)
            consecutive_abs = np.random.choice([0, 1, 2], p=[0.5, 0.35, 0.15])
            prev_points = np.random.choice([0, 5, 10, 15], p=[0.4, 0.35, 0.15, 0.10])
            wop_rate = np.random.uniform(0.55, 0.85)
        else: # struggling
            present_rate = np.random.uniform(0.25, 0.65)
            consecutive_abs = np.random.choice([1, 2, 3, 4], p=[0.2, 0.3, 0.3, 0.2])
            prev_points = np.random.choice([10, 15, 20, 30, 40], p=[0.2, 0.25, 0.25, 0.2, 0.1])
            wop_rate = np.random.uniform(0.20, 0.55)

        present_count = int(np.round(present_rate * obs_required))
        present_count = max(0, min(obs_required, present_count))
        absence_count = obs_required - present_count
        attendance_rate = np.round((present_count / obs_required) * 100.0, 1)
        wop_attendance_rate = np.round(wop_rate * 100.0, 1)

        # 4. Outcome Window (Weeks 5-8): strictly used to calculate the future ground truth label
        # Simulate future absences in the outcome window:
        if trait == "conscientious":
            outcome_absences = np.random.poisson(lam=0.4)
        elif trait == "average":
            outcome_absences = np.random.poisson(lam=2.5)
        else:
            outcome_absences = np.random.poisson(lam=5.5)

        # Label assignment based on OUTCOME window violations (ground truth outcome):
        # 0 - 1 absences in outcome window -> LOW risk
        # 2 - 4 absences in outcome window -> MEDIUM risk
        # >= 5 absences in outcome window -> HIGH risk
        if outcome_absences <= 1:
            risk_label = "LOW"
        elif outcome_absences <= 4:
            risk_label = "MEDIUM"
        else:
            risk_label = "HIGH"

        records.append({
            "student_id": 1000 + s_idx,
            "residence_category": residence,
            "required_attendance": obs_required,
            "present_count": present_count,
            "absence_count": absence_count,
            "attendance_rate": attendance_rate,
            "consecutive_absences": consecutive_abs,
            "previous_violation_points": prev_points,
            "wop_attendance_rate": wop_attendance_rate,
            "risk_category": risk_label
        })

    df = pd.DataFrame(records)
    return df

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "synthetic_student_dataset.csv")

    df = generate_student_disciplinary_dataset(1500)
    df.to_csv(out_file, index=False)
    print(f"Generated {len(df)} rows to {out_file}")
    print("\nClass Distribution:")
    print(df["risk_category"].value_counts(normalize=True).round(3))
