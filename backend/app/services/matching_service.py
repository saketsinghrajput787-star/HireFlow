"""
HireFlow Match Engine — Phase 4A
Deterministic, transparent candidate-to-job matching algorithm.

Scoring Breakdown (Normalized 0–100):
1. Required Skills Overlap (50 points max):
   - Semantic normalization and alias mapping (e.g. React.js -> React, TS -> TypeScript).
   - Accurate distinction between confirmed missing skills vs. unprovided profile skills.
   - Missing skills do not penalize unfairly when the student has not yet entered skill data.
2. Role & Specialization Alignment (20 points max):
   - Keyword alignment between job title and candidate preferred role, headline, and past titles.
3. Location & Work-Mode Alignment (15 points max):
   - Full credit for remote positions; proximity/alignment matching for hybrid/onsite.
4. Experience & Education Preparedness (15 points max):
   - Experience alignment weighted by role seniority (entry, mid, senior).
   - Education degree and field verification.

Decision Support Policy:
Match scores are authoritative recommendations computed entirely on the backend to aid discovery
and review. They are not automated hiring decisions and are accompanied by full factor explanations.
"""

import re
from typing import Dict, Any, List, Optional, Set
from app.schemas.matching import JobMatchScore


SKILL_ALIASES: Dict[str, str] = {
    "react": "react",
    "reactjs": "react",
    "react.js": "react",
    "reactnative": "react",
    "node": "node",
    "nodejs": "node",
    "node.js": "node",
    "vue": "vue",
    "vuejs": "vue",
    "vue.js": "vue",
    "angular": "angular",
    "angularjs": "angular",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "psql": "postgresql",
    "mongo": "mongodb",
    "mongodb": "mongodb",
    "mysql": "mysql",
    "ts": "typescript",
    "typescript": "typescript",
    "js": "javascript",
    "javascript": "javascript",
    "ecmascript": "javascript",
    "python": "python",
    "py": "python",
    "fastapi": "fastapi",
    "fast api": "fastapi",
    "django": "django",
    "flask": "flask",
    "spring": "springboot",
    "springboot": "springboot",
    "spring boot": "springboot",
    "k8s": "kubernetes",
    "kubernetes": "kubernetes",
    "docker": "docker",
    "aws": "aws",
    "amazon web services": "aws",
    "gcp": "gcp",
    "google cloud": "gcp",
    "azure": "azure",
    "tailwind": "tailwindcss",
    "tailwindcss": "tailwindcss",
    "tailwind css": "tailwindcss",
    "next": "nextjs",
    "nextjs": "nextjs",
    "next.js": "nextjs",
    "golang": "go",
    "go": "go",
    "c++": "cpp",
    "cpp": "cpp",
    "c#": "csharp",
    "csharp": "csharp",
    "git": "git",
    "github": "git",
    "gitlab": "git",
    "html": "html",
    "html5": "html",
    "css": "css",
    "css3": "css",
    "sql": "sql",
    "nosql": "nosql",
    "redis": "redis",
    "java": "java",
}


def normalize_skill(skill: str) -> str:
    """Normalizes skill string for accurate canonical comparison."""
    cleaned = skill.strip().lower()
    cleaned = re.sub(r'[\s\-_\.]+', '', cleaned)
    for alias, canonical in SKILL_ALIASES.items():
        alias_clean = alias.replace(' ', '').replace('.', '').replace('-', '')
        if cleaned == alias_clean:
            return canonical
    return cleaned


def skills_overlap(required_skill: str, candidate_skills: List[str]) -> bool:
    """Checks whether a required skill is matched by any candidate skill."""
    req_norm = normalize_skill(required_skill)
    req_raw = required_skill.strip().lower()

    for cand in candidate_skills:
        cand_norm = normalize_skill(cand)
        cand_raw = cand.strip().lower()

        # Direct canonical or exact match
        if req_norm == cand_norm or req_raw == cand_raw:
            return True

        # Substring match (e.g. "React" in "React Native", "FastAPI" in "FastAPI Framework")
        if len(req_raw) >= 3 and (req_raw in cand_raw or cand_raw in req_raw):
            return True

    return False


def calculate_job_match(
    job: Dict[str, Any],
    candidate_profile: Optional[Dict[str, Any]]
) -> JobMatchScore:
    """
    Authoritative, deterministic candidate-to-job matching algorithm (0-100 score).

    Scoring weights:
    - Required Skills Overlap: 50 points max
    - Role & Specialization Alignment: 20 points max
    - Location & Work-Mode: 15 points max
    - Experience & Education: 15 points max (8 exp, 7 edu)
    """
    job_skills: List[str] = [s.strip() for s in (job.get("required_skills") or []) if s.strip()]
    job_title: str = (job.get("title") or "").strip()
    job_location: str = (job.get("location") or "").strip()
    job_work_mode: str = (job.get("work_mode") or "remote").strip().lower()
    job_exp_level: str = (job.get("experience_level") or "entry_level").strip().lower()
    job_desc: str = (job.get("description") or "").lower()

    # Case 1: Candidate has no saved profile record at all
    if not candidate_profile:
        return JobMatchScore(
            score=40,
            matched_skills=[],
            missing_skills=job_skills,
            match_reasons=[
                "Profile is incomplete: Add your skills, education, and experience to view personalized match scores.",
                "Decision support only: Match scores evaluate profile overlap and do not substitute human hiring review."
            ],
            is_partial_profile=True,
        )

    cand_skills: List[str] = [s.strip() for s in (candidate_profile.get("skills") or []) if s.strip()]
    cand_pref_role: str = (candidate_profile.get("preferred_role") or "").strip()
    cand_pref_loc: str = (candidate_profile.get("preferred_location") or "").strip()
    cand_headline: str = (candidate_profile.get("headline") or "").strip()
    cand_experience: List[Dict[str, Any]] = [
        e for e in (candidate_profile.get("experience") or []) if isinstance(e, dict)
    ]
    cand_education: List[Dict[str, Any]] = [
        e for e in (candidate_profile.get("education") or []) if isinstance(e, dict)
    ]

    has_skills = len(cand_skills) > 0
    has_exp = len(cand_experience) > 0
    has_edu = len(cand_education) > 0
    is_partial: bool = not has_skills and not has_exp

    match_reasons: List[str] = []
    matched_skills: List[str] = []
    missing_skills: List[str] = []

    # -------------------------------------------------------------------------
    # 1. Skills Matching (50 points max)
    # -------------------------------------------------------------------------
    skill_points = 0.0
    if job_skills:
        if has_skills:
            for rs in job_skills:
                if skills_overlap(rs, cand_skills):
                    matched_skills.append(rs)
                else:
                    missing_skills.append(rs)

            overlap_ratio = len(matched_skills) / len(job_skills)
            skill_points = overlap_ratio * 50.0

            if matched_skills:
                preview = ", ".join(matched_skills[:3])
                suffix = f" (+{len(matched_skills) - 3} more)" if len(matched_skills) > 3 else ""
                match_reasons.append(f"Matches {len(matched_skills)} of {len(job_skills)} required skills: {preview}{suffix}.")
            if missing_skills:
                preview = ", ".join(missing_skills[:3])
                suffix = f" (+{len(missing_skills) - 3} more)" if len(missing_skills) > 3 else ""
                match_reasons.append(f"Missing {len(missing_skills)} required skill{'s' if len(missing_skills) > 1 else ''}: {preview}{suffix}.")
            else:
                match_reasons.append("Complete skill alignment: Candidate possesses all listed required skills.")
        else:
            # Candidate has not entered any skills yet — provide neutral baseline rather than 0
            skill_points = 20.0
            missing_skills = list(job_skills)
            match_reasons.append("Technical skills not yet listed on candidate profile (neutral baseline applied).")
    else:
        # Flexible/open skills position
        skill_points = 42.0
        if has_skills:
            skill_points = min(50.0, 42.0 + len(cand_skills) * 1.5)
            match_reasons.append("Job has open/flexible skill requirements; candidate profile lists verified technical skills.")
        else:
            match_reasons.append("Job has open/flexible skill requirements.")

    # -------------------------------------------------------------------------
    # 2. Role & Title Alignment (20 points max)
    # -------------------------------------------------------------------------
    role_points = 0.0
    job_words: Set[str] = set(re.findall(r'\b[a-zA-Z]{3,}\b', job_title.lower()))
    stopwords = {"and", "the", "for", "with", "level", "senior", "lead", "staff", "junior", "mid", "associate", "role", "position"}
    core_job_words = job_words - stopwords

    cand_role_text = f"{cand_pref_role} {cand_headline} " + " ".join(
        exp.get("title", "") for exp in cand_experience
    ).lower()
    cand_role_words: Set[str] = set(re.findall(r'\b[a-zA-Z]{3,}\b', cand_role_text.lower()))

    common_keywords = core_job_words & cand_role_words
    if len(common_keywords) >= 2:
        role_points = 20.0
        match_reasons.append(f"Strong role match: Candidate target role and experience align directly with '{job_title}'.")
    elif len(common_keywords) == 1:
        role_points = 15.0
        match_reasons.append(f"Role match: Shares core specialization '{next(iter(common_keywords))}'.")
    elif cand_pref_role:
        role_points = 9.0
        match_reasons.append(f"Target role '{cand_pref_role}' evaluated against '{job_title}'.")
    else:
        role_points = 11.0  # Neutral baseline if preferred role not specified
        match_reasons.append("Preferred role not specified on profile (neutral alignment).")

    # -------------------------------------------------------------------------
    # 3. Location & Work-Mode Preference (15 points max)
    # -------------------------------------------------------------------------
    loc_points = 0.0
    if job_work_mode == "remote":
        loc_points = 15.0
        match_reasons.append("Remote position accommodates candidate from any location.")
    elif cand_pref_loc:
        cand_loc_lower = cand_pref_loc.lower()
        job_loc_lower = job_location.lower()
        if "remote" in cand_loc_lower or any(part.strip() in job_loc_lower for part in cand_loc_lower.split(",")):
            loc_points = 15.0
            match_reasons.append(f"Candidate location preference aligns with '{job_location}'.")
        else:
            loc_points = 6.0
            match_reasons.append(f"Position is {job_work_mode} in '{job_location}' (candidate prefers '{cand_pref_loc}').")
    else:
        loc_points = 10.0  # Neutral baseline
        match_reasons.append("Location preference not specified (neutral evaluation).")

    # -------------------------------------------------------------------------
    # 4. Experience & Education Preparedness (15 points max: 8 Exp + 7 Edu)
    # -------------------------------------------------------------------------
    exp_points = 0.0
    if job_exp_level in ("internship", "entry_level"):
        if has_exp:
            exp_points = min(8.0, 5.0 + len(cand_experience) * 1.5)
            match_reasons.append(f"Has {len(cand_experience)} prior professional or internship role{'s' if len(cand_experience) > 1 else ''}.")
        else:
            exp_points = 5.0  # Entry level does not penalize lack of prior roles
            match_reasons.append("Entry-level / Internship opportunity; previous experience not strictly required.")
    elif job_exp_level == "mid_level":
        if len(cand_experience) >= 2:
            exp_points = 8.0
            match_reasons.append(f"Recorded experience ({len(cand_experience)} roles) aligns with mid-level requirements.")
        elif len(cand_experience) == 1:
            exp_points = 6.0
            match_reasons.append("Candidate lists 1 prior role relevant to mid-level expectations.")
        else:
            exp_points = 3.0
            match_reasons.append("Mid-level position; candidate profile does not list prior professional experience.")
    else:  # senior_level
        if len(cand_experience) >= 3:
            exp_points = 8.0
            match_reasons.append(f"Substantial experience history ({len(cand_experience)} roles) aligns with senior requirements.")
        elif len(cand_experience) >= 1:
            exp_points = 5.0
            match_reasons.append(f"Senior position; candidate lists {len(cand_experience)} role{'s' if len(cand_experience) > 1 else ''}.")
        else:
            exp_points = 2.0
            match_reasons.append("Senior-level position; candidate profile does not list prior experience.")

    edu_points = 0.0
    job_mentions_degree = any(k in job_desc for k in ["degree", "bachelor", "master", "phd", "computer science", "b.s", "b.tech"])
    if has_edu:
        edu_item = cand_education[0]
        deg = edu_item.get("degree") or "Degree"
        field = edu_item.get("field_of_study") or ""
        edu_desc = f"{deg}{f' in {field}' if field else ''}"
        if job_mentions_degree:
            edu_points = 7.0
            match_reasons.append(f"Education requirement met: {edu_desc}.")
        else:
            edu_points = 6.5
            match_reasons.append(f"Verified education: {edu_desc}.")
    else:
        if job_mentions_degree:
            edu_points = 3.5
            match_reasons.append("Job description references educational credentials; none listed on candidate profile.")
        else:
            edu_points = 4.5
            match_reasons.append("Education history not specified (job has open education requirements).")

    # -------------------------------------------------------------------------
    # 5. Composite Score Calculation & Normalization
    # -------------------------------------------------------------------------
    raw_total = skill_points + role_points + loc_points + exp_points + edu_points
    final_score = int(min(max(round(raw_total), 10), 100))

    if is_partial:
        final_score = min(final_score, 45)
        match_reasons.insert(0, "Profile is incomplete: Add your skills and experiences to receive a personalized match score.")

    match_reasons.append("Decision support only: Match score evaluates profile overlap and does not substitute human hiring review.")

    return JobMatchScore(
        score=final_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        match_reasons=match_reasons,
        is_partial_profile=is_partial,
    )
