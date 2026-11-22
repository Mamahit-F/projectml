import hashlib
import re
import unicodedata
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple


def normalize_person_name(name: str) -> str:
    """
    Cautiously normalize student names for comparison:
    - Unicode NFKD normalization & stripping diacritics
    - Lowercase
    - Remove punctuation except spaces
    - Collapse multiple whitespace
    """
    if not name:
        return ""
    text = unicodedata.normalize("NFKD", str(name))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _name_similarity(a: str, b: str) -> float:
    """
    Compute cautious name similarity handling both full-name order and minor truncation
    (e.g. 'watania lovely giovanny marchanda' vs 'watania lovely giovanny marchan').
    """
    na = normalize_person_name(a)
    nb = normalize_person_name(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0

    ta = set(na.split())
    tb = set(nb.split())
    # Handle truncated last token (e.g., long first name clipped in PDF)
    if len(ta) >= 2 and len(tb) >= 2:
        matched_tokens = 0
        for x in ta:
            if any(x == y or (len(x) >= 4 and len(y) >= 4 and (x.startswith(y) or y.startswith(x))) for y in tb):
                matched_tokens += 1
        token_score = matched_tokens / max(len(ta), len(tb))
    else:
        token_score = len(ta & tb) / max(1, len(ta | tb))

    # Order-invariant sorted-token string similarity
    sa = " ".join(sorted(ta))
    sb = " ".join(sorted(tb))
    seq_score = SequenceMatcher(None, sa, sb).ratio()
    return round(max(token_score, seq_score), 4)


def _make_internal_id(anchor_key: str) -> str:
    digest = hashlib.sha256(anchor_key.encode("utf-8")).hexdigest()[:12].upper()
    return f"STU-{digest}"


def resolve_student_identities(raw_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Resolve student identities across all historical reporting periods with strict integrity:
    1. Primary key: NIM (Student Reg Number), validated against name consensus across periods.
    2. Detects real-world NIM-Name mismatch anomalies (e.g., when a spreadsheet sort shifted
       the Name/Points columns relative to the NIM column in a specific report, like
       06-11-2026 Filsafat / partial FILKOM). Affected records are NEVER silently merged
       into the wrong student; they are explicitly flagged as IDENTITY_CONFLICT_NIM_NAME_MISMATCH
       for human review!
    3. Records missing NIM are matched ONLY if an exact unique normalized name exists in the
       same faculty; otherwise flagged as IDENTITY_UNCERTAIN (missing NIM / ambiguous match).
    4. Deduplicates multiple records for the same student within the same reporting_date
       (recording exact duplicate diagnostics).
    5. Produces a stable internal_student_id (STU-XXXXXXXXXXXX) for every student entity.
    """
    # Pass 1: Gather all (nim -> list of normalized names & occurrences) across all records
    nim_name_records: Dict[str, List[Tuple[str, str, str, str]]] = defaultdict(list)
    # Also track (normalized_name -> set of NIMs)
    name_to_nims: Dict[str, Counter] = defaultdict(Counter)

    for rec in raw_records:
        nim = (rec.get("raw_nim") or "").strip().upper()
        norm_name = normalize_person_name(rec.get("student_name", ""))
        if nim:
            nim_name_records[nim].append(
                (norm_name, rec.get("student_name", ""), rec.get("reporting_date", ""), rec.get("source_file", ""))
            )
            if norm_name:
                name_to_nims[norm_name][nim] += 1

    # Pass 2: Establish consensus canonical name per NIM and detect conflicting NIMs
    nim_consensus: Dict[str, Dict[str, Any]] = {}
    nim_conflicts: List[Dict[str, Any]] = []
    # Map (source_file, nim) -> conflict reason when a specific report contradicts multi-period consensus
    conflicting_record_keys: Dict[Tuple[str, str], Dict[str, Any]] = {}

    for nim, entries in nim_name_records.items():
        # Cluster entries by high similarity (>= 0.72) so truncated spellings stay grouped
        clusters: List[List[Tuple[str, str, str, str]]] = []
        for entry in entries:
            placed = False
            for cl in clusters:
                if _name_similarity(entry[0], cl[0][0]) >= 0.72:
                    cl.append(entry)
                    placed = True
                    break
            if not placed:
                clusters.append([entry])

        # Sort clusters by frequency (tie-break by earliest reporting date = original registration)
        clusters.sort(key=lambda cl: (-len(cl), min(e[2] for e in cl)))
        canonical_cluster = clusters[0]
        # Pick the longest display name in canonical cluster (avoids truncated PDF spelling)
        canonical_display = max((e[1] for e in canonical_cluster), key=len)
        canonical_norm = normalize_person_name(canonical_display)

        has_conflict = len(clusters) > 1
        nim_consensus[nim] = {
            "canonical_name": canonical_display,
            "canonical_norm": canonical_norm,
            "total_occurrences": len(entries),
            "canonical_occurrences": len(canonical_cluster),
            "has_conflict": has_conflict,
        }

        if has_conflict:
            for minor_cluster in clusters[1:]:
                for norm_n, disp_n, rep_dt, src_f in minor_cluster:
                    sim = _name_similarity(canonical_norm, norm_n)
                    # Check if this different name actually belongs to ANOTHER NIM in consensus
                    other_nims = [n for n in name_to_nims.get(norm_n, {}) if n != nim]
                    reason = (
                        "NIM_SORT_SHIFT_SUSPECTED"
                        if other_nims
                        else "NIM_NAME_CONFLICT_UNRESOLVED"
                    )
                    conflict_detail = {
                        "nim": nim,
                        "reporting_date": rep_dt,
                        "source_file": src_f,
                        "expected_canonical_name": canonical_display,
                        "observed_name": disp_n,
                        "name_similarity": sim,
                        "observed_name_other_nims": other_nims[:3],
                        "conflict_type": reason,
                        "resolution_action": "FLAGGED_IDENTITY_UNCERTAIN_EXCLUDED_FROM_MERGE",
                    }
                    nim_conflicts.append(conflict_detail)
                    conflicting_record_keys[(src_f, nim)] = conflict_detail

    # Pass 3: Build reverse index from unique canonical normalized name -> NIM (for cautious missing-NIM lookup)
    unique_name_to_nim: Dict[Tuple[str, str], List[str]] = defaultdict(list)
    global_name_to_nim: Dict[str, List[str]] = defaultdict(list)
    # Build faculty lookup per NIM
    nim_faculties: Dict[str, Counter] = defaultdict(Counter)
    for rec in raw_records:
        nim = (rec.get("raw_nim") or "").strip().upper()
        if nim:
            nim_faculties[nim][rec.get("faculty", "")] += 1

    for nim, info in nim_consensus.items():
        top_fac = nim_faculties[nim].most_common(1)[0][0] if nim_faculties[nim] else ""
        unique_name_to_nim[(top_fac, info["canonical_norm"])].append(nim)
        global_name_to_nim[info["canonical_norm"]].append(nim)

    # Pass 4: Detect same-name different-NIM pairs (potential duplicate identities for manual review)
    ambiguous_name_groups: List[Dict[str, Any]] = []
    for norm_n, nims_list in global_name_to_nim.items():
        if norm_n and len(set(nims_list)) > 1:
            ambiguous_name_groups.append(
                {
                    "normalized_name": norm_n,
                    "candidate_nims": sorted(set(nims_list)),
                    "note": "Nama identik muncul dengan lebih dari satu NIM; tidak digabung otomatis (perlu tinjauan manual).",
                }
            )

    # Pass 5: Assign stable internal_student_id and identity_status to every record
    resolved_records: List[Dict[str, Any]] = []
    missing_nim_resolutions: List[Dict[str, Any]] = []
    within_period_duplicates: List[Dict[str, Any]] = []
    seen_student_period: Dict[Tuple[str, str], int] = {}

    for rec in raw_records:
        nim = (rec.get("raw_nim") or "").strip().upper()
        disp_name = rec.get("student_name", "Tanpa Nama")
        norm_name = normalize_person_name(disp_name)
        faculty = rec.get("faculty", "Universitas Klabat")
        rep_date = rec.get("reporting_date", "")
        src_file = rec.get("source_file", "")

        identity_status = "VERIFIED_BY_NIM"
        identity_warning: Optional[str] = None
        internal_id: str
        resolved_nim: Optional[str] = nim or None
        canonical_name = disp_name

        if nim:
            conflict = conflicting_record_keys.get((src_file, nim))
            if conflict is not None:
                # Quarantine conflicting row under an explicit uncertain entity so we NEVER corrupt the real student!
                identity_status = "IDENTITY_UNCERTAIN"
                identity_warning = (
                    f"Konflik NIM-Nama ({conflict['conflict_type']}): NIM {nim} biasanya '{conflict['expected_canonical_name']}', "
                    f"tetapi pada {src_file} tercatat sebagai '{disp_name}'."
                )
                internal_id = _make_internal_id(f"CONFLICT::{nim}::{norm_name}::{rep_date}")
                canonical_name = disp_name
            else:
                internal_id = _make_internal_id(f"NIM::{nim}")
                canonical_name = nim_consensus[nim]["canonical_name"]
                if _name_similarity(canonical_name, disp_name) < 0.99:
                    identity_status = "VERIFIED_BY_NIM_MINOR_SPELLING_VARIANT"
        else:
            # Missing NIM: attempt cautious exact-name match within same faculty ONLY if unique
            fac_candidates = unique_name_to_nim.get((faculty, norm_name), [])
            glob_candidates = global_name_to_nim.get(norm_name, [])
            if len(fac_candidates) == 1:
                matched_nim = fac_candidates[0]
                internal_id = _make_internal_id(f"NIM::{matched_nim}")
                resolved_nim = matched_nim
                canonical_name = nim_consensus[matched_nim]["canonical_name"]
                identity_status = "MATCHED_BY_EXACT_NAME_MISSING_NIM"
                identity_warning = f"NIM kosong pada {src_file}; cocok unik secara eksak dengan NIM {matched_nim} pada fakultas yang sama."
                missing_nim_resolutions.append(
                    {
                        "source_file": src_file,
                        "reporting_date": rep_date,
                        "observed_name": disp_name,
                        "matched_nim": matched_nim,
                        "status": identity_status,
                    }
                )
            elif len(glob_candidates) == 1:
                matched_nim = glob_candidates[0]
                internal_id = _make_internal_id(f"NIM::{matched_nim}")
                resolved_nim = matched_nim
                canonical_name = nim_consensus[matched_nim]["canonical_name"]
                identity_status = "MATCHED_BY_EXACT_NAME_MISSING_NIM"
                identity_warning = f"NIM kosong pada {src_file}; cocok unik secara eksak dengan NIM {matched_nim}."
                missing_nim_resolutions.append(
                    {
                        "source_file": src_file,
                        "reporting_date": rep_date,
                        "observed_name": disp_name,
                        "matched_nim": matched_nim,
                        "status": identity_status,
                    }
                )
            else:
                internal_id = _make_internal_id(f"NONIM::{faculty}::{norm_name}")
                resolved_nim = None
                identity_status = "IDENTITY_UNCERTAIN"
                identity_warning = (
                    f"NIM kosong pada {src_file} dan tidak ditemukan kecocokan unik yang pasti; ditandai untuk tinjauan manual."
                )
                missing_nim_resolutions.append(
                    {
                        "source_file": src_file,
                        "reporting_date": rep_date,
                        "observed_name": disp_name,
                        "matched_nim": None,
                        "status": identity_status,
                    }
                )

        enriched = {
            **rec,
            "internal_student_id": internal_id,
            "student_id": resolved_nim or internal_id,
            "resolved_nim": resolved_nim,
            "canonical_student_name": canonical_name,
            "normalized_student_name": normalize_person_name(canonical_name),
            "identity_status": identity_status,
            "identity_warning": identity_warning,
        }

        dedup_key = (internal_id, rep_date)
        if dedup_key in seen_student_period:
            prev_idx = seen_student_period[dedup_key]
            within_period_duplicates.append(
                {
                    "internal_student_id": internal_id,
                    "nim": resolved_nim,
                    "reporting_date": rep_date,
                    "first_source": resolved_records[prev_idx]["source_file"],
                    "duplicate_source": src_file,
                    "first_points": resolved_records[prev_idx]["total_points"],
                    "duplicate_points": enriched["total_points"],
                }
            )
            # Keep record with higher information completeness (non-Umum prodi, or latest)
            if resolved_records[prev_idx]["study_program"] == "Umum" and enriched["study_program"] != "Umum":
                resolved_records[prev_idx] = enriched
        else:
            seen_student_period[dedup_key] = len(resolved_records)
            resolved_records.append(enriched)

    # Backfill study_program for students who had 'Umum' in 5-column periods but real prodi in 6-column periods
    known_prodi_by_student: Dict[str, str] = {}
    for rec in resolved_records:
        if rec["study_program"] and rec["study_program"] != "Umum":
            known_prodi_by_student[rec["internal_student_id"]] = rec["study_program"]
    for rec in resolved_records:
        if (not rec["study_program"] or rec["study_program"] == "Umum") and rec["internal_student_id"] in known_prodi_by_student:
            rec["study_program"] = known_prodi_by_student[rec["internal_student_id"]]

    unique_verified = {r["internal_student_id"] for r in resolved_records if r["identity_status"] != "IDENTITY_UNCERTAIN"}
    unique_uncertain = {r["internal_student_id"] for r in resolved_records if r["identity_status"] == "IDENTITY_UNCERTAIN"}

    return {
        "records": resolved_records,
        "summary": {
            "total_resolved_records": len(resolved_records),
            "unique_students_total": len(unique_verified | unique_uncertain),
            "unique_verified_students": len(unique_verified),
            "unique_uncertain_entities": len(unique_uncertain),
            "nim_name_conflicts_count": len(nim_conflicts),
            "missing_nim_records_count": len(missing_nim_resolutions),
            "ambiguous_same_name_groups_count": len(ambiguous_name_groups),
            "within_period_duplicates_count": len(within_period_duplicates),
        },
        "nim_conflicts": nim_conflicts,
        "missing_nim_resolutions": missing_nim_resolutions,
        "ambiguous_name_groups": ambiguous_name_groups,
        "within_period_duplicates": within_period_duplicates,
    }
