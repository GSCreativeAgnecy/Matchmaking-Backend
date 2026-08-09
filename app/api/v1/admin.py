from datetime import UTC
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session, require_role
from app.db.enums import JobVerificationStatus
from app.db.models import Payment, Report, Subscription, User
from app.repositories.moderation_repo import ReportRepository
from app.repositories.user_repo import UserRepository
from app.schemas.common import ApiResponse
from app.services.audit_service import AuditService
from app.services.verification_service import VerificationService

router = APIRouter(prefix="/admin", tags=["admin"])

admin_only = require_role("ADMIN", "SUPER_ADMIN")
moderator = require_role("MODERATOR", "ADMIN", "SUPER_ADMIN")
verifier = require_role("VERIFIER", "ADMIN", "SUPER_ADMIN")


# ---------- users ----------


@router.get("/users", summary="List users (admin)", response_model=ApiResponse[list[dict]])
async def list_users(
    user: User = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
) -> ApiResponse[list[dict]]:
    stmt = select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    if status:
        stmt = stmt.where(User.account_status == status)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.email.ilike(like), User.phone_number.ilike(like)))
    rows = (await session.execute(stmt)).scalars().all()
    return ApiResponse(
        data=[
            {
                "id": str(u.id),
                "email": u.email,
                "phone_number": u.phone_number,
                "account_status": u.account_status.value,
                "role": u.role.value,
                "is_banned": u.is_banned,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in rows
        ]
    )


@router.post("/users/{user_id}/ban", summary="Ban a user", response_model=ApiResponse[dict])
async def ban_user(
    user_id: UUID,
    admin: User = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    from datetime import datetime

    from app.db.enums import AccountStatus

    target = await UserRepository(session).get(user_id)
    if target is None:
        from app.api.errors import NotFoundError

        raise NotFoundError("User not found")
    target.is_banned = True
    target.banned_at = datetime.now(UTC)
    target.account_status = AccountStatus.BANNED
    await AuditService(session).record(
        action="admin.ban", actor_user_id=admin.id, entity_type="user", entity_id=str(user_id)
    )
    await session.commit()
    return ApiResponse(data={"status": "banned"})


@router.post("/users/{user_id}/unban", summary="Unban a user", response_model=ApiResponse[dict])
async def unban_user(
    user_id: UUID,
    admin: User = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    from app.db.enums import AccountStatus

    target = await UserRepository(session).get(user_id)
    if target is None:
        from app.api.errors import NotFoundError

        raise NotFoundError("User not found")
    target.is_banned = False
    target.banned_at = None
    target.account_status = AccountStatus.ACTIVE
    await AuditService(session).record(
        action="admin.unban", actor_user_id=admin.id, entity_type="user", entity_id=str(user_id)
    )
    await session.commit()
    return ApiResponse(data={"status": "unbanned"})


@router.post("/users/{user_id}/role", summary="Change a user's role", response_model=ApiResponse[dict])
async def change_role(
    user_id: UUID,
    payload: dict,
    admin: User = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    from app.db.enums import UserRole

    new_role = payload.get("role")
    if not isinstance(new_role, str) or new_role not in UserRole.__members__:
        from app.api.errors import ValidationAppError

        raise ValidationAppError("Invalid role")
    target = await UserRepository(session).get(user_id)
    if target is None:
        from app.api.errors import NotFoundError

        raise NotFoundError("User not found")
    target.role = UserRole[new_role]
    await AuditService(session).record(
        action="admin.role_change",
        actor_user_id=admin.id,
        entity_type="user",
        entity_id=str(user_id),
        metadata={"role": new_role},
    )
    await session.commit()
    return ApiResponse(data={"status": "updated", "role": new_role})


# ---------- reports ----------


@router.get("/reports", summary="List reports", response_model=ApiResponse[list[dict]])
async def list_reports(
    user: User = Depends(moderator),
    session: AsyncSession = Depends(get_session),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, le=500),
) -> ApiResponse[list[dict]]:
    reports = await ReportRepository(session).list_by_status(status, limit=limit)
    return ApiResponse(
        data=[
            {
                "id": str(r.id),
                "reporter_id": str(r.reporter_id),
                "reported_user_id": str(r.reported_user_id),
                "reason": r.reason,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reports
        ]
    )


@router.post("/reports/{report_id}/review", summary="Review a report", response_model=ApiResponse[dict])
async def review_report(
    report_id: UUID,
    payload: dict,
    reviewer: User = Depends(moderator),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    from datetime import datetime

    report = await session.get(Report, report_id)
    if report is None:
        from app.api.errors import NotFoundError

        raise NotFoundError("Report not found")
    report.status = payload.get("status", report.status)
    report.reviewed_by = reviewer.id
    report.reviewed_at = datetime.now(UTC)
    await AuditService(session).record(
        action="report.review",
        actor_user_id=reviewer.id,
        entity_type="report",
        entity_id=str(report.id),
        metadata={"status": report.status},
    )
    await session.commit()
    return ApiResponse(data={"status": report.status})


# ---------- job verification ----------


@router.get("/verifications/job", summary="List job verifications", response_model=ApiResponse[list[dict]])
async def list_job_verifications(
    user: User = Depends(verifier),
    session: AsyncSession = Depends(get_session),
    status: JobVerificationStatus | None = Query(default=None),
) -> ApiResponse[list[dict]]:
    service = VerificationService(session)
    rows = await service.list_by_status(status)
    return ApiResponse(
        data=[
            {
                "id": str(v.id),
                "user_id": str(v.user_id),
                "employer_name": v.employer_name,
                "verification_status": v.verification_status.value,
                "submitted_at": v.submitted_at.isoformat() if v.submitted_at else None,
            }
            for v in rows
        ]
    )


@router.post(
    "/verifications/job/{verification_id}/review",
    summary="Approve or reject a job verification",
    response_model=ApiResponse[dict],
)
async def review_job_verification(
    verification_id: UUID,
    payload: dict,
    reviewer: User = Depends(verifier),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    service = VerificationService(session)
    verification = await service.review(
        reviewer,
        verification_id,
        approve=payload.get("approve", False),
        rejection_reason=payload.get("rejection_reason"),
    )
    await session.commit()
    return ApiResponse(
        data={
            "id": str(verification.id),
            "verification_status": verification.verification_status.value,
        }
    )


# ---------- subscriptions / payments ----------


@router.get("/subscriptions", summary="List subscriptions", response_model=ApiResponse[list[dict]])
async def list_subscriptions(
    user: User = Depends(moderator),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, le=500),
) -> ApiResponse[list[dict]]:
    stmt = select(Subscription).order_by(Subscription.created_at.desc()).limit(limit)
    rows = (await session.execute(stmt)).scalars().all()
    return ApiResponse(
        data=[
            {
                "id": str(s.id),
                "user_id": str(s.user_id),
                "status": s.status.value,
                "starts_at": s.starts_at.isoformat() if s.starts_at else None,
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            }
            for s in rows
        ]
    )


@router.get("/payments", summary="List payments", response_model=ApiResponse[list[dict]])
async def list_payments(
    user: User = Depends(moderator),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, le=500),
) -> ApiResponse[list[dict]]:
    stmt = select(Payment).order_by(Payment.created_at.desc()).limit(limit)
    rows = (await session.execute(stmt)).scalars().all()
    return ApiResponse(
        data=[
            {
                "id": str(p.id),
                "user_id": str(p.user_id),
                "amount": float(p.amount),
                "currency": p.currency,
                "payment_type": p.payment_type,
                "status": p.status.value,
            }
            for p in rows
        ]
    )
