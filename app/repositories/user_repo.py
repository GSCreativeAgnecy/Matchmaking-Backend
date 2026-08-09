from datetime import UTC
from uuid import UUID

from sqlalchemy import or_, select

from app.db.models import Profile, RefreshTokenRecord, User, UserPrivacySettings
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> User | None:
        stmt = select(User).where(User.phone_number == phone, User.deleted_at.is_(None))
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_email_or_phone(self, email: str | None, phone: str | None) -> User | None:
        if email and phone:
            stmt = select(User).where(or_(User.email == email, User.phone_number == phone), User.deleted_at.is_(None))
        elif email:
            return await self.get_by_email(email)
        else:
            return await self.get_by_phone(phone) if phone else None
        return (await self.session.execute(stmt)).scalars().first()

    async def ensure_profile(self, user_id: UUID) -> Profile:
        profile = await self.session.scalar(select(Profile).where(Profile.user_id == user_id))
        if profile is None:
            profile = Profile(user_id=user_id)
            self.session.add(profile)
            await self.session.flush()
        return profile

    async def get_privacy(self, user_id: UUID) -> UserPrivacySettings:
        settings = await self.session.scalar(select(UserPrivacySettings).where(UserPrivacySettings.user_id == user_id))
        if settings is None:
            settings = UserPrivacySettings(user_id=user_id)
            self.session.add(settings)
            await self.session.flush()
        return settings


class RefreshTokenRepository(BaseRepository[RefreshTokenRecord]):
    model = RefreshTokenRecord

    async def get_active(self, jti: str) -> RefreshTokenRecord | None:
        stmt = select(RefreshTokenRecord).where(RefreshTokenRecord.jti == jti, RefreshTokenRecord.revoked_at.is_(None))
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def revoke(self, record: RefreshTokenRecord, *, replaced_by: str | None = None) -> None:
        from datetime import datetime

        record.revoked_at = datetime.now(UTC)
        if replaced_by:
            record.replaced_by_jti = replaced_by

    async def revoke_all_for_user(self, user_id: UUID) -> None:
        from datetime import datetime

        stmt = select(RefreshTokenRecord).where(
            RefreshTokenRecord.user_id == user_id, RefreshTokenRecord.revoked_at.is_(None)
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        now = datetime.now(UTC)
        for row in rows:
            row.revoked_at = now
