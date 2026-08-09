"""Idempotent seed script.

Usage:
    python -m app.seed

Seeds lookup data (languages, religions, castes, countries, states, education,
occupations, interests), subscription plans, and config-driven pricing. Safe to
run repeatedly — it never duplicates rows.
"""

import asyncio
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.db.models import (
    AppConfig,
    Caste,
    Country,
    EducationLevel,
    Interest,
    Language,
    Occupation,
    Religion,
    State,
    SubscriptionPlan,
)
from app.db.session import SessionLocal

LANGUAGES = [
    ("en", "English"),
    ("hi", "Hindi"),
    ("bn", "Bengali"),
    ("ta", "Tamil"),
    ("te", "Telugu"),
    ("kn", "Kannada"),
    ("ml", "Malayalam"),
    ("mr", "Marathi"),
    ("gu", "Gujarati"),
    ("pa", "Punjabi"),
    ("or", "Odia"),
    ("ur", "Urdu"),
]

RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Parsi", "Other"]

CASTES = {
    "Hindu": [
        "Brahmin",
        "Kshatriya",
        "Vaishya",
        "Shudra",
        "Rajput",
        "Maratha",
        "Reddy",
        "Nair",
        "Iyer",
        "Jat",
        "Baniya",
        "Other",
    ],
    "Muslim": ["Sunni", "Shia", "Other"],
    "Christian": ["Catholic", "Protestant", "Syrian Christian", "Other"],
    "Sikh": ["Jat Sikh", "Khatri", "Arora", "Other"],
    "Jain": ["Digambara", "Shwetambara", "Other"],
}

COUNTRIES = [
    ("IN", "India"),
    ("US", "United States"),
    ("GB", "United Kingdom"),
    ("CA", "Canada"),
    ("AU", "Australia"),
    ("AE", "United Arab Emirates"),
    ("SG", "Singapore"),
]

INDIA_STATES = [
    "Andhra Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Tamil Nadu",
    "Telangana",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
]

EDUCATION_LEVELS = [
    "High School",
    "Diploma",
    "Bachelor's Degree",
    "Master's Degree",
    "Doctorate",
    "Professional Degree",
]

OCCUPATIONS = [
    "Software Engineer",
    "Doctor",
    "Lawyer",
    "Teacher",
    "Business Owner",
    "Accountant",
    "Architect",
    "Civil Engineer",
    "Nurse",
    "Marketing Manager",
    "Consultant",
    "Data Scientist",
    "Financial Analyst",
    "Government Employee",
    "Retired",
    "Homemaker",
]

INTERESTS = [
    ("sports", "Sports"),
    ("travel", "Travel"),
    ("cooking", "Cooking"),
    ("music", "Music"),
    ("movies", "Movies"),
    ("reading", "Reading"),
    ("fitness", "Fitness"),
    ("pets", "Pets"),
    ("volunteering", "Volunteering"),
    ("yoga", "Yoga"),
    ("photography", "Photography"),
    ("dance", "Dance"),
]

PLANS = [
    {
        "name": "Premium Plus",
        "description": "Unlimited likes, see who liked you, priority profile.",
        "price": Decimal("1999.00"),
        "currency": "INR",
        "duration_days": 90,
        "features": {"unlimited_likes": True, "see_who_liked_you": True, "priority": True},
    },
    {
        "name": "Premium",
        "description": "See who liked you and message all matches.",
        "price": Decimal("999.00"),
        "currency": "INR",
        "duration_days": 30,
        "features": {"unlimited_likes": False, "see_who_liked_you": True, "priority": False},
    },
]

CONFIG_ITEMS = {
    "LOCAL_JOB_VERIFICATION_PRICE": {
        "amount": int(settings.LOCAL_JOB_VERIFICATION_PRICE),
        "currency": settings.JOB_VERIFICATION_CURRENCY,
    },
    "NRI_JOB_VERIFICATION_PRICE": {
        "amount": int(settings.NRI_JOB_VERIFICATION_PRICE),
        "currency": settings.JOB_VERIFICATION_CURRENCY,
    },
}


async def _get_or_create(session: AsyncSession, model, *, lookup: dict, create: dict) -> tuple[object, bool]:
    obj = await session.scalar(select(model).where(*[getattr(model, k) == v for k, v in lookup.items()]))
    if obj is None:
        obj = model(**{**lookup, **create})
        session.add(obj)
        await session.flush()
        return obj, True
    return obj, False


async def seed(session: AsyncSession) -> int:
    created = 0

    for code, name in LANGUAGES:
        _, is_new = await _get_or_create(session, Language, lookup={"code": code}, create={"name": name})
        created += 1 if is_new else 0
    for name in RELIGIONS:
        _, is_new = await _get_or_create(session, Religion, lookup={"name": name}, create={})
        created += 1 if is_new else 0
    for religion, castes in CASTES.items():
        for caste in castes:
            _, is_new = await _get_or_create(session, Caste, lookup={"religion": religion, "name": caste}, create={})
            created += 1 if is_new else 0
    for code, name in COUNTRIES:
        _, is_new = await _get_or_create(session, Country, lookup={"code": code}, create={"name": name})
        created += 1 if is_new else 0
    for state in INDIA_STATES:
        _, is_new = await _get_or_create(session, State, lookup={"country_code": "IN", "name": state}, create={})
        created += 1 if is_new else 0
    for name in EDUCATION_LEVELS:
        _, is_new = await _get_or_create(session, EducationLevel, lookup={"name": name}, create={})
        created += 1 if is_new else 0
    for name in OCCUPATIONS:
        _, is_new = await _get_or_create(session, Occupation, lookup={"name": name}, create={})
        created += 1 if is_new else 0
    for slug, name in INTERESTS:
        _, is_new = await _get_or_create(session, Interest, lookup={"slug": slug}, create={"name": name})
        created += 1 if is_new else 0

    for plan in PLANS:
        _, is_new = await _get_or_create(session, SubscriptionPlan, lookup={"name": plan["name"]}, create=plan)
        created += 1 if is_new else 0

    for key, value in CONFIG_ITEMS.items():
        _, is_new = await _get_or_create(session, AppConfig, lookup={"key": key}, create={"value": value})
        created += 1 if is_new else 0

    await session.commit()
    return created


async def main() -> None:
    async with SessionLocal() as session:
        n = await seed(session)
        print(f"Seed complete. (new rows: {n})")


if __name__ == "__main__":
    asyncio.run(main())
