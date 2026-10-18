"""
HireFlow Resume Intelligence Service — Phase 4B
Local, deterministic resume text parsing, entity extraction, profile discrepancy detection,
and job-specific tailoring analysis without relying on external third-party paid AI APIs.
"""

import io
import re
from typing import Dict, Any, List, Optional, Tuple, Set
import httpx
from fastapi import HTTPException, status
from pypdf import PdfReader
from app.core.config import settings
from app.core.security import logger
from app.schemas.resume_intelligence import (
    DetectedEducation,
    DetectedExperience,
    DetectedProject,
    SectionPresence,
    ProfileDiscrepancy,
    ResumeAnalysisResponse,
    JobSpecificResumeAnalysisResponse,
)
from app.services.matching_service import (
    SKILL_ALIASES,
    normalize_skill,
    skills_overlap,
    calculate_job_match,
)


KNOWN_SKILLS_DICTIONARY: List[str] = [
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang",
    "rust", "ruby", "php", "swift", "kotlin", "scala", "dart", "sql", "r",
    # Frameworks & Libraries
    "react", "react.js", "react native", "next.js", "nextjs", "vue", "vue.js",
    "angular", "node", "node.js", "express", "express.js", "fastapi", "django",
    "flask", "spring", "spring boot", "ruby on rails", "asp.net", "laravel",
    "tailwind", "tailwindcss", "tailwind css", "bootstrap", "sass", "html", "html5", "css", "css3",
    # Databases & Caching
    "postgresql", "postgres", "mysql", "mongodb", "sqlite", "redis", "elasticsearch",
    "cassandra", "dynamodb", "supabase", "firebase",
    # DevOps, Cloud & Tools
    "docker", "kubernetes", "k8s", "aws", "amazon web services", "azure", "gcp",
    "google cloud", "git", "github", "gitlab", "ci/cd", "terraform", "ansible",
    "linux", "nginx", "graphql", "rest api", "kafka", "rabbitmq", "microservices",
    # Data & AI/ML
    "pandas", "numpy", "pytorch", "tensorflow", "scikit-learn", "keras", "opencv",
    "nlp", "data analysis", "machine learning", "deep learning", "tableau", "power bi"
]


DEGREE_PATTERNS = [
    (r"\b(bachelor(?:'s)?|b\.?s\.?|b\.?tech\.?|b\.?e\.?|b\.?a\.?)\b", "Bachelor's Degree"),
    (r"\b(master(?:'s)?|m\.?s\.?|m\.?tech\.?|m\.?b\.?a\.?|m\.?e\.?)\b", "Master's Degree"),
    (r"\b(ph\.?d\.?|doctorate|doctoral)\b", "Ph.D. / Doctorate"),
    (r"\b(associate(?:'s)?|a\.?s\.?|a\.?a\.?)\b", "Associate Degree"),
    (r"\b(diploma|certificate|bootcamp)\b", "Diploma / Certificate"),
]

MAJOR_PATTERNS = [
    (r"computer science", "Computer Science"),
    (r"software engineering", "Software Engineering"),
    (r"information technology", "Information Technology"),
    (r"data science", "Data Science"),
    (r"computer engineering", "Computer Engineering"),
    (r"electrical engineering", "Electrical Engineering"),
    (r"cybersecurity", "Cybersecurity"),
    (r"artificial intelligence", "Artificial Intelligence"),
    (r"mathematics", "Mathematics"),
    (r"mechanical engineering", "Mechanical Engineering"),
]


class ResumeIntelligenceService:
    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self._client = client

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=15.0)

    def _get_headers(self) -> Dict[str, str]:
        key = settings.SUPABASE_SERVICE_ROLE_KEY if "placeholder" not in settings.SUPABASE_SERVICE_ROLE_KEY else settings.SUPABASE_PUBLISHABLE_KEY
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        }

    # =========================================================================
    # 1. Secure Resume Binary Fetching
    # =========================================================================

    async def fetch_resume_bytes(self, resume_path: str) -> bytes:
        """
        Securely downloads resume bytes from the private 'resumes' Supabase storage bucket.
        Validates path format and strictly blocks unauthenticated or public access.
        """
        if not resume_path or not resume_path.strip():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate does not have an uploaded resume."
            )

        clean_path = resume_path.strip()
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()
        headers = self._get_headers()

        # Method A: Direct authenticated REST endpoint
        try:
            auth_url = f"{base_url}/storage/v1/object/authenticated/resumes/{clean_path}"
            resp = await client.get(auth_url, headers=headers)
            if resp.status_code == 200 and len(resp.content) > 0:
                return resp.content
        except Exception as e:
            logger.warning("Direct storage download attempt failed for %s: %s", clean_path, str(e))

        # Method B: Secure signed URL fallback
        try:
            sign_url = f"{base_url}/storage/v1/object/sign/resumes/{clean_path}"
            sign_resp = await client.post(sign_url, json={"expiresIn": 60}, headers=headers)
            if sign_resp.status_code == 200:
                signed_path = sign_resp.json().get("signedURL")
                if signed_path:
                    download_url = f"{base_url}/storage/v1{signed_path}"
                    file_resp = await client.get(download_url)
                    if file_resp.status_code == 200 and len(file_resp.content) > 0:
                        return file_resp.content
        except Exception as e:
            logger.warning("Signed URL download attempt failed for %s: %s", clean_path, str(e))

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to retrieve resume file from secure storage. Please ensure the file was uploaded successfully."
        )

    # =========================================================================
    # 2. PDF Text Extraction & Validation
    # =========================================================================

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> Tuple[str, int, bool, bool, Optional[str]]:
        """
        Extracts raw text from PDF bytes using pypdf.
        Returns: (full_text, page_count, is_readable, is_scanned_or_empty, limitation_notice)
        """
        if len(pdf_bytes) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume file exceeds the maximum permitted size of 5.0 MB."
            )

        if not pdf_bytes.startswith(b"%PDF"):
            return (
                "",
                0,
                False,
                False,
                "The uploaded file is not a valid PDF document header."
            )

        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            page_count = len(reader.pages)

            if page_count == 0:
                return (
                    "",
                    0,
                    False,
                    True,
                    "The PDF file contains zero pages."
                )

            extracted_pages: List[str] = []
            for i, page in enumerate(reader.pages):
                try:
                    text = page.extract_text() or ""
                    extracted_pages.append(text)
                except Exception as ex:
                    logger.warning("Error reading page %d: %s", i, str(ex))

            full_text = "\n".join(extracted_pages).strip()
            # Normalize whitespace
            clean_text = re.sub(r'[ \t]+', ' ', full_text)

            # Check if empty or scanned image PDF
            char_count = len(re.sub(r'\s+', '', clean_text))
            if char_count < 40:
                return (
                    clean_text,
                    page_count,
                    False,
                    True,
                    "Your resume appears to be an image-only or scanned PDF without an embedded text layer. "
                    "HireFlow could not extract readable text. Please re-export your resume directly as a text-based PDF "
                    "(e.g., from Google Docs, Microsoft Word, Canva, or LaTeX) to enable automated intelligence."
                )

            return (clean_text, page_count, True, False, None)

        except Exception as e:
            logger.error("Failed to parse PDF bytes: %s", str(e))
            return (
                "",
                0,
                False,
                False,
                f"PDF parsing error: The document structure could not be processed ({str(e)})."
            )

    # =========================================================================
    # 3. Entity Extraction & Semantic Parsing
    # =========================================================================

    def parse_resume_content(self, text: str) -> Dict[str, Any]:
        """
        Extracts structured entities, detects sections, and scores presentation strengths.
        """
        text_lower = text.lower()
        words = text.split()
        word_count = len(words)

        # 1. Section Header Detection
        has_contact = bool(re.search(r'(@|linkedin\.com|github\.com|\bphone\b|\+?\d{10,12}\b)', text_lower))
        has_summary = bool(re.search(r'\b(summary|professional summary|objective|about me|profile)\b', text_lower))
        has_skills = bool(re.search(r'\b(skills|technical skills|technologies|tools|competencies)\b', text_lower))
        has_experience = bool(re.search(r'\b(experience|work experience|employment|internships|work history)\b', text_lower))
        has_education = bool(re.search(r'\b(education|academic background|university|college|degrees)\b', text_lower))
        has_projects = bool(re.search(r'\b(projects|personal projects|academic projects|key projects)\b', text_lower))
        has_certifications = bool(re.search(r'\b(certifications|certificates|licenses|credentials|awards)\b', text_lower))

        sections = SectionPresence(
            has_contact_info=has_contact,
            has_summary=has_summary,
            has_skills=has_skills,
            has_experience=has_experience,
            has_education=has_education,
            has_projects=has_projects,
            has_certifications=has_certifications,
        )

        # 2. Skills Extraction (using word boundary matching and canonical mapping)
        detected_skills_set: Set[str] = set()
        for skill_kw in KNOWN_SKILLS_DICTIONARY:
            # Escape regex symbols in skills like c++, c#, .net
            escaped = re.escape(skill_kw)
            pattern = rf'(?:^|[\s,;:(/])({escaped})(?:$|[\s,;:)/])'
            if re.search(pattern, text_lower):
                # Standardize display casing
                canonical = SKILL_ALIASES.get(skill_kw.lower(), skill_kw)
                display_name = canonical.capitalize()
                if canonical in ("javascript", "typescript", "fastapi", "postgresql", "mongodb", "graphql"):
                    display_name = {
                        "javascript": "JavaScript",
                        "typescript": "TypeScript",
                        "fastapi": "FastAPI",
                        "postgresql": "PostgreSQL",
                        "mongodb": "MongoDB",
                        "graphql": "GraphQL",
                    }.get(canonical, canonical.capitalize())
                elif canonical in ("aws", "gcp", "k8s", "sql", "css", "html"):
                    display_name = canonical.upper()
                detected_skills_set.add(display_name)

        detected_skills = sorted(list(detected_skills_set))

        # 3. Education Extraction
        detected_education: List[DetectedEducation] = []
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        for i, line in enumerate(lines):
            line_l = line.lower()
            detected_degree = None
            detected_major = None
            detected_year = None

            for pat, deg_name in DEGREE_PATTERNS:
                if re.search(pat, line_l):
                    detected_degree = deg_name
                    break

            for pat, maj_name in MAJOR_PATTERNS:
                if re.search(pat, line_l):
                    detected_major = maj_name
                    break

            year_match = re.search(r'\b(20[1-3][0-9])\b', line)
            if year_match:
                detected_year = year_match.group(1)

            if detected_degree or detected_major or (detected_year and has_education and ("university" in line_l or "institute" in line_l or "college" in line_l)):
                # Institution look-up
                inst = None
                for candidate_line in [line] + lines[max(0, i - 1):min(len(lines), i + 2)]:
                    c_low = candidate_line.lower()
                    if any(k in c_low for k in ["university", "institute", "college", "school", "academy"]):
                        inst = candidate_line[:60].strip()
                        break

                detected_education.append(
                    DetectedEducation(
                        institution=inst,
                        degree=detected_degree or "Degree",
                        field_of_study=detected_major,
                        year=detected_year,
                        raw_text=line[:120],
                    )
                )

        # Deduplicate education entries by degree + major
        unique_edu: List[DetectedEducation] = []
        seen_edu: Set[str] = set()
        for e in detected_education:
            key = f"{e.degree}_{e.field_of_study}_{e.year}"
            if key not in seen_edu:
                seen_edu.add(key)
                unique_edu.append(e)

        # 4. Experience Highlights & Projects
        detected_experience: List[DetectedExperience] = []
        exp_role_keywords = [
            "software engineer", "developer", "backend", "frontend", "full stack",
            "intern", "internship", "analyst", "specialist", "engineer", "lead", "architect"
        ]
        for line in lines:
            line_l = line.lower()
            for rk in exp_role_keywords:
                if rk in line_l and len(line) < 80:
                    dur_match = re.search(r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\s*20\d\d\s*[-–—to]+\s*(?:present|current|20\d\d|\w+))', line_l)
                    detected_experience.append(
                        DetectedExperience(
                            title=line,
                            duration=dur_match.group(1) if dur_match else None,
                            summary=None
                        )
                    )
                    break
            if len(detected_experience) >= 4:
                break

        detected_projects: List[DetectedProject] = []
        project_keywords = ["project", "github.com", "app", "system", "portfolio", "platform"]
        for line in lines:
            if any(pk in line.lower() for pk in project_keywords) and len(line) < 70 and not line.startswith("http"):
                detected_projects.append(
                    DetectedProject(
                        title=line,
                        description=None
                    )
                )
            if len(detected_projects) >= 4:
                break

        # 5. Certifications
        detected_certifications: List[str] = []
        cert_keywords = ["aws certified", "cloud practitioner", "solutions architect", "azure", "comptia", "certified", "google professional"]
        for line in lines:
            for ck in cert_keywords:
                if ck in line.lower() and len(line) < 90:
                    detected_certifications.append(line)
                    break

        # 6. Professional Summary
        summary_text = None
        for i, line in enumerate(lines):
            if re.search(r'^(summary|professional summary|about me|profile|objective)[:\s]*$', line.lower()):
                # Take following 1-3 lines
                next_lines = lines[i + 1: min(len(lines), i + 4)]
                summary_text = " ".join(next_lines)[:350]
                break

        # 7. Strengths & Areas for Improvement
        strengths: List[str] = []
        improvements: List[str] = []

        if len(detected_skills) >= 6:
            strengths.append(f"Strong technical skill breadth: {len(detected_skills)} industry technologies detected.")
        elif len(detected_skills) >= 3:
            strengths.append(f"Identified {len(detected_skills)} relevant technical skills.")
        else:
            improvements.append("Expand your technical skills section: Few industry-standard technologies were detected.")

        if has_projects:
            strengths.append("Dedicated Projects section showcases practical hands-on application.")
        else:
            improvements.append("Add a 'Projects' section to showcase independent builds, open-source work, or academic coursework.")

        if has_experience:
            strengths.append("Structured work or internship experience history detected.")
        else:
            improvements.append("Include relevant internships, part-time technical work, or university roles in an 'Experience' section.")

        if has_summary:
            strengths.append("Professional Summary/Headline provides immediate recruiter context.")
        else:
            improvements.append("Include a 2–3 sentence Professional Summary at the top highlighting your focus and ambitions.")

        has_metrics = bool(re.search(r'\b(\d+%\b|\$\d+|\d+x\b|\d+\s*(?:users|clients|requests|ms|seconds|million|thousand))', text_lower))
        if has_metrics:
            strengths.append("Quantifiable impact: Contains measurable metrics, percentages, or performance statistics.")
        else:
            improvements.append("Add quantifiable metrics (e.g. 'Improved API response time by 30%', 'Served 5,000+ users') to bullet points.")

        return {
            "word_count": word_count,
            "detected_skills": detected_skills,
            "detected_education": unique_edu,
            "detected_experience": detected_experience,
            "detected_projects": detected_projects,
            "detected_certifications": list(set(detected_certifications)),
            "professional_summary": summary_text,
            "sections_detected": sections,
            "strengths": strengths,
            "areas_for_improvement": improvements,
        }

    # =========================================================================
    # 4. Profile vs Resume Discrepancy Detection
    # =========================================================================

    def detect_profile_discrepancies(
        self,
        parsed_resume: Dict[str, Any],
        candidate_profile: Dict[str, Any]
    ) -> List[ProfileDiscrepancy]:
        """
        Compares extracted resume content against candidate's database profile.
        Flags mismatches for the student to review without mutating any saved profile data.
        """
        discrepancies: List[ProfileDiscrepancy] = []

        profile_skills: List[str] = [s.strip() for s in (candidate_profile.get("skills") or []) if s.strip()]
        resume_skills: List[str] = parsed_resume.get("detected_skills") or []

        # Skills on profile but missing from resume
        missing_from_resume = [
            ps for ps in profile_skills
            if not any(skills_overlap(ps, [rs]) for rs in resume_skills)
        ]
        if missing_from_resume:
            preview = ", ".join(missing_from_resume[:3])
            suffix = f" (+{len(missing_from_resume) - 3} more)" if len(missing_from_resume) > 3 else ""
            discrepancies.append(
                ProfileDiscrepancy(
                    category="skills",
                    description=f"Skills saved on your profile are not mentioned in your uploaded resume: {preview}{suffix}.",
                    profile_value=", ".join(profile_skills[:5]),
                    resume_value=", ".join(resume_skills[:5]),
                    recommendation="If you possess these skills, consider adding them to your resume document so automated applicant tracking systems (ATS) can verify them."
                )
            )

        # Skills detected on resume but missing from profile
        missing_from_profile = [
            rs for rs in resume_skills
            if not any(skills_overlap(rs, [ps]) for ps in profile_skills)
        ]
        if missing_from_profile:
            preview = ", ".join(missing_from_profile[:3])
            suffix = f" (+{len(missing_from_profile) - 3} more)" if len(missing_from_profile) > 3 else ""
            discrepancies.append(
                ProfileDiscrepancy(
                    category="skills",
                    description=f"Technologies detected in your resume are missing from your saved profile skills: {preview}{suffix}.",
                    profile_value=", ".join(profile_skills[:5]) if profile_skills else "None listed",
                    resume_value=", ".join(resume_skills[:5]),
                    recommendation="Add these skills to your student profile to boost your automated job match ratings across HireFlow."
                )
            )

        # Graduation year check
        prof_grad = candidate_profile.get("graduation_year")
        if prof_grad:
            detected_edus = parsed_resume.get("detected_education") or []
            resume_years = [e.year for e in detected_edus if e.year]
            if resume_years and str(prof_grad) not in resume_years:
                discrepancies.append(
                    ProfileDiscrepancy(
                        category="education",
                        description=f"Your profile lists graduation year {prof_grad}, while your resume references {', '.join(resume_years)}.",
                        profile_value=str(prof_grad),
                        resume_value=", ".join(resume_years),
                        recommendation="Verify that your graduation date is consistent across both your profile and resume."
                    )
                )

        return discrepancies

    # =========================================================================
    # 5. Core Student Resume Analysis
    # =========================================================================

    async def analyze_student_resume(self, student_id: str, email: str) -> ResumeAnalysisResponse:
        """
        Executes end-to-end resume intelligence for the authenticated student's uploaded PDF.
        """
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()
        headers = self._get_headers()

        # Step 1: Fetch candidate profile to get resume_path
        cand_res = await client.get(
            f"{base_url}/rest/v1/candidate_profiles?student_id=eq.{student_id}",
            headers=headers
        )
        if cand_res.status_code != 200 or not cand_res.json():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate profile record not found."
            )

        cand_profile = cand_res.json()[0]
        resume_path = cand_profile.get("resume_path")
        if not resume_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No resume has been uploaded yet. Please upload a PDF resume on your profile page to run analysis."
            )

        # Enforce security boundary: resume_path must start with student_id
        if not resume_path.startswith(f"{student_id}/"):
            logger.warning("Unauthorized resume path access attempt: user %s tried to access %s", student_id, resume_path)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only analyze your own uploaded resume."
            )

        filename = resume_path.split("/")[-1] if "/" in resume_path else "resume.pdf"

        # Step 2: Download raw PDF bytes securely
        pdf_bytes = await self.fetch_resume_bytes(resume_path)
        file_size = len(pdf_bytes)

        # Step 3: Extract and validate PDF text
        clean_text, page_count, is_readable, is_scanned, limitation_notice = self.extract_text_from_pdf(pdf_bytes)

        if not is_readable or is_scanned:
            return ResumeAnalysisResponse(
                resume_path=resume_path,
                filename=filename,
                file_size_bytes=file_size,
                page_count=page_count,
                word_count=0,
                is_readable=False,
                is_scanned_or_empty=is_scanned,
                limitation_notice=limitation_notice,
                strengths=[],
                areas_for_improvement=[
                    "Re-export your resume as a standard text-searchable PDF (not a flat image or scanned photo).",
                    "Ensure text can be highlighted and copied in a PDF viewer."
                ],
                profile_discrepancies=[],
            )

        # Step 4: Parse entities and semantic sections
        parsed = self.parse_resume_content(clean_text)

        # Step 5: Detect discrepancies with candidate profile
        discrepancies = self.detect_profile_discrepancies(parsed, cand_profile)

        return ResumeAnalysisResponse(
            resume_path=resume_path,
            filename=filename,
            file_size_bytes=file_size,
            page_count=page_count,
            word_count=parsed["word_count"],
            is_readable=True,
            is_scanned_or_empty=False,
            limitation_notice=None,
            detected_skills=parsed["detected_skills"],
            detected_education=parsed["detected_education"],
            detected_experience=parsed["detected_experience"],
            detected_projects=parsed["detected_projects"],
            detected_certifications=parsed["detected_certifications"],
            professional_summary=parsed["professional_summary"],
            sections_detected=parsed["sections_detected"],
            strengths=parsed["strengths"],
            areas_for_improvement=parsed["areas_for_improvement"],
            profile_discrepancies=discrepancies,
        )

    # =========================================================================
    # 6. Job-Specific Tailoring Analysis
    # =========================================================================

    async def analyze_resume_against_job(
        self,
        student_id: str,
        job_id: str
    ) -> JobSpecificResumeAnalysisResponse:
        """
        Compares the student's actual resume text against a specific published job opening.
        Generates concrete, respectful tailoring suggestions and identifies keyword evidence.
        """
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()
        headers = self._get_headers()

        # 1. Fetch published job details
        job_res = await client.get(
            f"{base_url}/rest/v1/jobs?id=eq.{job_id}",
            headers=headers
        )
        if job_res.status_code != 200 or not job_res.json():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found.")

        job = job_res.json()[0]
        if job.get("status") != "published":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job opening is not open for application.")

        # 2. Fetch candidate profile and Phase 4A match score reference
        cand_res = await client.get(
            f"{base_url}/rest/v1/candidate_profiles?student_id=eq.{student_id}",
            headers=headers
        )
        cand_profile = cand_res.json()[0] if cand_res.status_code == 200 and cand_res.json() else None
        if not cand_profile or not cand_profile.get("resume_path"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You need to upload a resume on your profile before running job-specific resume analysis."
            )

        resume_path = cand_profile["resume_path"]
        filename = resume_path.split("/")[-1] if "/" in resume_path else "resume.pdf"

        # Calculate Phase 4A match score for baseline reference (unaltered)
        phase4a_match = calculate_job_match(job, cand_profile)
        profile_match_score = phase4a_match.score

        # 3. Retrieve and parse resume PDF text
        pdf_bytes = await self.fetch_resume_bytes(resume_path)
        clean_text, page_count, is_readable, is_scanned, limitation_notice = self.extract_text_from_pdf(pdf_bytes)

        if not is_readable or is_scanned:
            return JobSpecificResumeAnalysisResponse(
                job_id=job["id"],
                job_title=job["title"],
                job_company=job["company"],
                resume_path=resume_path,
                filename=filename,
                is_readable=False,
                is_scanned_or_empty=is_scanned,
                limitation_notice=limitation_notice,
                job_required_skills=job.get("required_skills") or [],
                skills_found_in_resume=[],
                skills_not_detected_in_resume=job.get("required_skills") or [],
                relevant_experience_evidence=[],
                relevant_education_evidence=[],
                tailoring_suggestions=[
                    "Upload a text-searchable PDF resume so automated analysis can evaluate alignment with this job."
                ],
                resume_improvements=[],
                profile_vs_resume_notes=[],
                profile_match_score=profile_match_score,
            )

        # 4. Compare job required skills against actual resume text
        job_skills = [s.strip() for s in (job.get("required_skills") or []) if s.strip()]
        parsed_resume = self.parse_resume_content(clean_text)
        detected_skills = parsed_resume["detected_skills"]
        text_lower = clean_text.lower()

        skills_found: List[str] = []
        skills_not_detected: List[str] = []

        for req_skill in job_skills:
            if skills_overlap(req_skill, detected_skills) or re.search(rf'\b{re.escape(req_skill.lower())}\b', text_lower):
                skills_found.append(req_skill)
            else:
                skills_not_detected.append(req_skill)

        # 5. Extract Evidence for Experience & Education
        experience_evidence: List[str] = []
        job_title_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', job.get("title", "").lower()))
        stopwords = {"and", "the", "for", "with", "level", "senior", "lead", "staff", "junior", "mid", "associate"}
        core_job_words = job_title_words - stopwords

        for exp in parsed_resume["detected_experience"]:
            if exp.title:
                t_lower = exp.title.lower()
                if any(w in t_lower for w in core_job_words):
                    experience_evidence.append(f"Role title match: '{exp.title}' reflects target specialization.")
                elif any(sk.lower() in t_lower for sk in skills_found):
                    experience_evidence.append(f"Relevant role: '{exp.title}' incorporates key technologies.")

        education_evidence: List[str] = []
        job_desc_lower = (job.get("description") or "").lower()
        for edu in parsed_resume["detected_education"]:
            if edu.degree or edu.field_of_study:
                desc = f"{edu.degree or 'Degree'}{f' in {edu.field_of_study}' if edu.field_of_study else ''}"
                if any(k in job_desc_lower for k in ["degree", "bachelor", "master", "computer science", "engineering"]):
                    education_evidence.append(f"Education credential: {desc} satisfies educational criteria.")
                else:
                    education_evidence.append(f"Recorded academic background: {desc}.")

        # 6. Tailoring Suggestions
        tailoring_suggestions: List[str] = []
        resume_improvements: List[str] = []
        profile_vs_resume_notes: List[str] = []

        # Skill-based suggestions
        if skills_not_detected:
            preview = ", ".join(skills_not_detected[:3])
            suffix = f" (+{len(skills_not_detected) - 3} more)" if len(skills_not_detected) > 3 else ""
            tailoring_suggestions.append(
                f"Highlight required technologies: '{preview}{suffix}' are required by {job.get('company', 'the employer')} but were not detected in your resume document."
            )

        # Title alignment suggestion
        job_title = job.get("title", "")
        if not any(core_w in text_lower for core_w in core_job_words):
            tailoring_suggestions.append(
                f"Incorporate target role phrasing: Mention '{job_title}' or its core specializations in your resume summary or header."
            )

        # Work mode / Location suggestion
        work_mode = job.get("work_mode", "remote")
        location = job.get("location", "")
        if work_mode != "remote" and location.lower() not in text_lower:
            tailoring_suggestions.append(
                f"Clarify location availability: This role is {work_mode} in '{location}'. Consider adding your location or open-to-relocate note."
            )

        # Section-level improvement recommendations
        sections: SectionPresence = parsed_resume["sections_detected"]
        if not sections.has_summary:
            resume_improvements.append(
                f"Add a brief professional headline tailored towards '{job_title}'."
            )
        if not sections.has_projects and job_skills:
            resume_improvements.append(
                f"Include projects demonstrating hands-on experience with {', '.join(job_skills[:2])}."
            )
        if not sections.has_certifications and any(k in job_desc_lower for k in ["aws", "cloud", "security", "certified"]):
            resume_improvements.append(
                "Consider highlighting relevant cloud or technology certifications."
            )

        # Profile vs Resume notes
        cand_skills = [s.strip() for s in (cand_profile.get("skills") or []) if s.strip()]
        for req_skill in skills_not_detected:
            if any(skills_overlap(req_skill, cand_skills)):
                profile_vs_resume_notes.append(
                    f"You have '{req_skill}' listed on your HireFlow profile, but it is not mentioned in your resume text. Adding it to your resume will help pass employer ATS filters."
                )

        return JobSpecificResumeAnalysisResponse(
            job_id=job["id"],
            job_title=job["title"],
            job_company=job["company"],
            resume_path=resume_path,
            filename=filename,
            is_readable=True,
            is_scanned_or_empty=False,
            limitation_notice=None,
            job_required_skills=job_skills,
            skills_found_in_resume=skills_found,
            skills_not_detected_in_resume=skills_not_detected,
            relevant_experience_evidence=experience_evidence,
            relevant_education_evidence=education_evidence,
            tailoring_suggestions=tailoring_suggestions,
            resume_improvements=resume_improvements,
            profile_vs_resume_notes=profile_vs_resume_notes,
            profile_match_score=profile_match_score,
        )


resume_intelligence_service = ResumeIntelligenceService()
