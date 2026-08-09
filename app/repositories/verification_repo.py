from uuid import UUID

from sqlalchemy import select

from app.db.enums import JobVerificationStatus
from app.db.models import JobVerification
from app.repositories.base import BaseRepository


class VerificationRepository(BaseRepository[JobVerification]):
    model = JobVerification

    async def latest_for_user(self, user_id: UUID) -> JobVerification | None:
        stmt = (
            select(JobVerification)
            .where(JobVerification.user_id == user_id)
            .order_by(JobVerification.created_at.desc())
            .limit(1)
        )
        return (await self.session.execute(stmt)).scalars().first()

    async def get_for_user(self, verification_id: UUID, user_id: UUID) -> JobVerification | None:
        return await self.session.scalar(
            select(JobVerification).where(JobVerification.id == verification_id, JobVerification.user_id == user_id)
        )

    async def list_by_status(self, status: JobVerificationStatus | None = None) -> list[JobVerification]:
        stmt = select(JobVerification).order_by(JobVerification.created_at.desc())
        if status:
            stmt = stmt.where(JobVerification.verification_status == status)
        return list((await self.session.execute(stmt)).scalars().all())
