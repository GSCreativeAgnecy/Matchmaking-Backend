from uuid import UUID

from sqlalchemy import or_, select

from app.db.enums import MatchStatus
from app.db.models import Match
from app.repositories.base import BaseRepository


class MatchRepository(BaseRepository[Match]):
    model = Match

    @staticmethod
    def normalize(a: UUID, b: UUID) -> tuple[UUID, UUID]:
        def _as_uuid(x: UUID) -> UUID:
            return UUID(str(x)) if not isinstance(x, UUID) else x

        a, b = _as_uuid(a), _as_uuid(b)
        return (min(a, b), max(a, b))

    async def get_between(self, a: UUID, b: UUID) -> Match | None:
        u1, u2 = self.normalize(a, b)
        return await self.session.scalar(select(Match).where(Match.user1_id == u1, Match.user2_id == u2))

    async def get_active_between(self, a: UUID, b: UUID) -> Match | None:
        m = await self.get_between(a, b)
        return m if m and m.status == MatchStatus.ACTIVE else None

    async def active_match_ids_for(self, user_id: UUID) -> list[UUID]:
        stmt = select(Match.id).where(
            or_(Match.user1_id == user_id, Match.user2_id == user_id),
            Match.status == MatchStatus.ACTIVE,
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def matches_for(self, user_id: UUID) -> list[Match]:
        stmt = (
            select(Match)
            .where(
                or_(Match.user1_id == user_id, Match.user2_id == user_id),
                Match.status == MatchStatus.ACTIVE,
            )
            .order_by(Match.matched_at.desc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    def other_user_id(self, match: Match, me: UUID) -> UUID:
        return match.user2_id if match.user1_id == me else match.user1_id

    async def create_between(self, a: UUID, b: UUID) -> Match:
        u1, u2 = self.normalize(a, b)
        return await self.create(user1_id=u1, user2_id=u2, status=MatchStatus.ACTIVE)
