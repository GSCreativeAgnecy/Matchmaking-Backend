from uuid import UUID

from sqlalchemy import select

from app.db.models import Block, Report
from app.repositories.base import BaseRepository


class BlockRepository(BaseRepository[Block]):
    model = Block

    async def get_pair(self, blocker_id: UUID, blocked_id: UUID) -> Block | None:
        return await self.session.scalar(
            select(Block).where(Block.blocker_id == blocker_id, Block.blocked_id == blocked_id)
        )

    async def blocked_ids(self, user_id: UUID) -> list[UUID]:
        stmt = select(Block.blocked_id).where(Block.blocker_id == user_id)
        return list((await self.session.execute(stmt)).scalars().all())

    async def who_blocked_me(self, user_id: UUID) -> list[UUID]:
        stmt = select(Block.blocker_id).where(Block.blocked_id == user_id)
        return list((await self.session.execute(stmt)).scalars().all())


class ReportRepository(BaseRepository[Report]):
    model = Report

    async def list_by_status(self, status: str | None = None, *, limit: int = 50, offset: int = 0) -> list[Report]:
        stmt = select(Report)
        if status:
            stmt = stmt.where(Report.status == status)
        stmt = stmt.order_by(Report.created_at.desc()).limit(limit).offset(offset)
        return list((await self.session.execute(stmt)).scalars().all())
