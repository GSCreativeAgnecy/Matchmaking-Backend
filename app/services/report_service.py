from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import ForbiddenError, NotFoundError
from app.db.models import Report, User
from app.repositories.moderation_repo import ReportRepository
from app.repositories.user_repo import UserRepository
from app.services.audit_service import AuditService


class ReportService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ReportRepository(session)
        self.users = UserRepository(session)
        self.audit = AuditService(session)

    async def create(
        self, reporter: User, reported_user_id: UUID, reason: str, description: str | None = None
    ) -> Report:
        if str(reporter.id) == str(reported_user_id):
            raise ForbiddenError("You cannot report yourself", code="SELF_REPORT")
        target = await self.users.get(reported_user_id)
        if not target:
            raise NotFoundError("User not found", code="USER_NOT_FOUND")
        report = await self.repo.create(
            reporter_id=reporter.id,
            reported_user_id=reported_user_id,
            reason=reason,
            description=description,
            status="PENDING",
        )
        await self.audit.record(
            action="report.create", actor_user_id=reporter.id, entity_type="report", entity_id=str(report.id)
        )
        return report
