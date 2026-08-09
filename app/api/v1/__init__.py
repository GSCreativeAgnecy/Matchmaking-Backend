from fastapi import APIRouter

from app.api.v1 import (
    admin,
    auth,
    blocks,
    family,
    matches,
    messages,
    notifications,
    payments,
    photos,
    preferences,
    profiles,
    recommendations,
    reports,
    shares,
    subscriptions,
    swipes,
    users,
    verification,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(profiles.router)
api_router.include_router(photos.router)
api_router.include_router(preferences.router)
api_router.include_router(family.router)
api_router.include_router(swipes.router)
api_router.include_router(matches.router)
api_router.include_router(messages.router)
api_router.include_router(notifications.router)
api_router.include_router(blocks.router)
api_router.include_router(reports.router)
api_router.include_router(recommendations.router)
api_router.include_router(subscriptions.router)
api_router.include_router(payments.router)
api_router.include_router(verification.router)
api_router.include_router(shares.router)
api_router.include_router(admin.router)
