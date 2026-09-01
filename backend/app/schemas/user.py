from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.products import DIAGNOSTIC_TRACKS

VALID_CLASSES = {"11", "12", "other"}


class DiagnosticRequest(BaseModel):
    """Post-signup diagnostic (track selection) payload.

    Both fields are optional: skipping the diagnostic flow simply means
    the frontend never calls the endpoint (columns stay NULL). An empty
    target_tracks list is a valid explicit "no track selected (yet)".
    Tracks are product ids from PRODUCT_CATALOG -- no parallel concept.
    """
    target_tracks: list[str] = Field(default_factory=list)
    current_class: str | None = None

    @field_validator("target_tracks")
    @classmethod
    def validate_tracks(cls, v: list[str]) -> list[str]:
        seen: list[str] = []
        for t in v:
            if t not in DIAGNOSTIC_TRACKS:
                raise ValueError(
                    f"Invalid track: {t}. Must be one of: {', '.join(DIAGNOSTIC_TRACKS)}"
                )
            if t not in seen:
                seen.append(t)
        return seen

    @field_validator("current_class")
    @classmethod
    def validate_class(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if v not in VALID_CLASSES:
            raise ValueError(
                f"Invalid class: {v}. Must be one of: {', '.join(sorted(VALID_CLASSES))}"
            )
        return v


class DiagnosticResponse(BaseModel):
    target_tracks: list[str] = Field(default_factory=list)
    current_class: str | None = None
    diagnostic_completed_at: datetime | None = None
