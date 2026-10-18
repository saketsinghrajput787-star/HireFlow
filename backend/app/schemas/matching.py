from typing import List
from pydantic import BaseModel, Field


class JobMatchScore(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Match score normalized between 0 and 100")
    matched_skills: List[str] = Field(default_factory=list, description="Candidate skills that match job required skills")
    missing_skills: List[str] = Field(default_factory=list, description="Job required skills missing from candidate profile")
    match_reasons: List[str] = Field(default_factory=list, description="Transparent explanations of match factors")
    is_partial_profile: bool = Field(default=False, description="True if candidate has empty or incomplete profile data")
