from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.db.enums import SubscriptionStatus
from app.db.models import Payment, Subscription, SubscriptionPlan
from app.repositories.base import BaseRepository


class SubscriptionRepository(BaseRepository[Subscription]):
    model = Subscription

    async def get_active(self, user_id: UUID) -> Subscription | None:
        stmt = (
            select(Subscription)
            .where(Subscription.user_id == user_id, Subscription.status == SubscriptionStatus.ACTIVE)
            .order_by(Subscription.expires_at.desc())
            .limit(1)
        )
        return (await self.session.execute(stmt)).scalars().first()

    async def is_premium(self, user_id: UUID) -> bool:
        sub = await self.get_active(user_id)
        if not sub or not sub.expires_at:
            return False
        return sub.expires_at > datetime.now(UTC)

    async def expire_due(self) -> list[Subscription]:
        now = datetime.now(UTC)
        stmt = select(Subscription).where(
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.expires_at.is_not(None),
            Subscription.expires_at < now,
        )
        return list((await self.session.execute(stmt)).scalars().all())


class SubscriptionPlanRepository(BaseRepository[SubscriptionPlan]):
    model = SubscriptionPlan

    async def list_active(self) -> list[SubscriptionPlan]:
        stmt = select(SubscriptionPlan).where(SubscriptionPlan.is_active.is_(True)).order_by(SubscriptionPlan.price)
        return list((await self.session.execute(stmt)).scalars().all())


class PaymentRepository(BaseRepository[Payment]):
    model = Payment

    async def get_by_provider_id(self, provider: str, provider_payment_id: str) -> Payment | None:
        return await self.session.scalar(
            select(Payment).where(Payment.provider == provider, Payment.provider_payment_id == provider_payment_id)
        )
