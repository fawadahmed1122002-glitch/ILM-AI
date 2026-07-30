"""
Single source of truth mapping a student's academic field (chosen at
registration) to (a) which subjects they should see content for, and
(b) which entry test(s) they're implicitly prepping for.

Used by:
- RegisterRequest validation + auto-deriving interested_tests
- Study/subject filtering (see "Restrict study subjects" task)
- Future: pricing tier selection (per-test/bundle pricing)
"""

FIELD_SUBJECTS: dict[str, list[str]] = {
    "pre-engineering": ["Physics", "Chemistry", "Mathematics", "English"],
    "pre-medical": ["Biology", "Chemistry", "Physics", "English"],
    "ics-physics": ["Mathematics", "Physics", "Computer Science", "English"],
    # NOTE: "Statistics" is not yet in ALLOWED_SUBJECTS (admin.py) or ingested
    # anywhere in the content library. ICS-Stats is scoped to Math + CS +
    # English until Statistics content actually exists -- do not silently
    # promise Statistics coverage until it's real.
    "ics-stats": ["Mathematics", "Statistics", "Computer Science", "English"],
}

FIELD_TESTS: dict[str, list[str]] = {
    "pre-engineering": ["ECAT", "NET"],
    "pre-medical": ["MDCAT"],
    # NOTE: ECAT here is per explicit founder instruction. UET's actual ECAT
    # eligibility is typically Physics/Chemistry/Math (Pre-Engineering) --
    # ICS-Physics students are not usually ECAT-eligible in practice at UET
    # specifically. Confirm whether "ECAT" in this app means the literal
    # UET test or an internal content category before this reaches real users.
    "ics-physics": ["ECAT", "FAST"],
    "ics-stats": ["FAST", "NET"],
}

FIELD_LABELS: dict[str, str] = {
    "pre-engineering": "Pre-Engineering",
    "pre-medical": "Pre-Medical",
    "ics-physics": "ICS (Physics)",
    "ics-stats": "ICS (Statistics)",
}

VALID_FIELDS = set(FIELD_SUBJECTS.keys())


def subjects_for_field(field: str | None) -> list[str] | None:
    if not field:
        return None
    return FIELD_SUBJECTS.get(field)


def tests_for_field(field: str | None) -> list[str] | None:
    if not field:
        return None
    return FIELD_TESTS.get(field)