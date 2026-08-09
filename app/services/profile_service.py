import math
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.db.enums import AccountStatus
from app.db.models import Profile, User
from app.repositories.match_repo import MatchRepository
from app.repositories.profile_repo import ProfileRepository
from app.repositories.user_repo import UserRepository
from app.schemas.profile import PublicProfileResponse
from app.services.audit_service import AuditService


def _age(dob: date | None) -> int | None:
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def distance_km(lat1: float | None, lng1: float | None, lat2: float | None, lng2: float | None) -> float | None:
    """Haversine approximate distance in km. None if coordinates missing."""
    if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
        return None
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)


class ProfileService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ProfileRepository(session)
        self.users = UserRepository(session)
        self.matches = MatchRepository(session)
        self.audit = AuditService(session)

    # ---------- own profile ----------

    async def ensure_profile(self, user: User) -> Profile:
        return await self.users.ensure_profile(user.id)

    async def get_own(self, user: User) -> Profile:
        return await self.ensure_profile(user)

    async def create(self, user: User, data: dict[str, Any]) -> Profile:
        if user.account_status == AccountStatus.PENDING:
            user.account_status = AccountStatus.ACTIVE
        profile = await self.users.ensure_profile(user.id)
        for field, value in data.items():
            if value is not None:
                setattr(profile, field, value)
        await self.audit.record(
            action="profile.update", actor_user_id=user.id, entity_type="profile", entity_id=profile.id
        )
        return profile

    async def update(self, user: User, data: dict[str, Any]) -> Profile:
        profile = await self.ensure_profile(user)
        for field, value in data.items():
            setattr(profile, field, value)
        await self.audit.record(
            action="profile.update", actor_user_id=user.id, entity_type="profile", entity_id=profile.id
        )
        return profile

    async def delete_account(self, user: User) -> None:

        user.deleted_at = datetime.now(UTC)
        user.account_status = AccountStatus.DELETED
        await self.audit.record(action="user.delete", actor_user_id=user.id, entity_type="user", entity_id=user.id)

    # ---------- viewing others ----------

    async def get_target_user(self, target_user_id: UUID) -> User:
        user = await self.users.get(target_user_id)
        if not user or user.deleted_at is not None:
            raise NotFoundError("User not found", code="USER_NOT_FOUND")
        return user

    async def matched_pair_ids(self, user_id: UUID) -> set[UUID]:
        matches = await self.matches.matches_for(user_id)
        ids = set()
        for m in matches:
            ids.add(m.user1_id)
            ids.add(m.user2_id)
        return ids - {user_id}

    async def serialize_public(
        self,
        viewer: User,
        target: User,
        profile: Profile,
        *,
        matched: bool = False,
        distance_to_viewer: float | None = None,
        photo_url: str | None = None,
    ) -> PublicProfileResponse:
        privacy = await self.users.get_privacy(target.id)
        show_distance = privacy.show_distance and distance_to_viewer is not None

        now = datetime.now(UTC)
        last_seen = None
        if privacy.show_last_seen and target.last_active_at:
            delta = (now - target.last_active_at).total_seconds()
            if delta < 3600:
                last_seen = f"{int(delta // 60)}m ago"
            elif delta < 86400:
                last_seen = f"{int(delta // 3600)}h ago"
            else:
                last_seen = f"{int(delta // 86400)}d ago"

        base: dict[str, Any] = {
            "id": str(profile.id),
            "user_id": str(target.id),
            "first_name": profile.first_name,
            "gender": profile.gender.value if profile.gender else None,
            "age": _age(profile.date_of_birth),
            "marital_status": profile.marital_status.value if profile.marital_status else None,
            "religion": profile.religion,
            "caste": profile.caste,
            "mother_tongue": profile.mother_tongue,
            "education": profile.education,
            "occupation": profile.occupation,
            "job_title": profile.job_title,
            "city": profile.city,
            "state": profile.state,
            "country": profile.country,
            "distance_km": distance_to_viewer if show_distance else None,
            "bio": profile.bio,
            "intent": profile.intent.value if profile.intent else None,
            "diet": profile.diet.value if profile.diet else None,
            "drinking": profile.drinking.value if profile.drinking else None,
            "smoking": profile.smoking.value if profile.smoking else None,
            "height_cm": profile.height_cm,
            "body_type": profile.body_type.value if profile.body_type else None,
            "profile_photo": photo_url,
            "last_seen": last_seen if privacy.show_online_status else None,
            "is_online": False,
            "is_verified_photo": False,
            "is_verified_job": False,
        }

        if matched:
            base["phone_number"] = target.phone_number
            base["email"] = target.email
            base["workplace"] = profile.workplace
            base["is_online"] = target.last_active_at and (now - target.last_active_at).total_seconds() < 120

        return PublicProfileResponse(**base)
