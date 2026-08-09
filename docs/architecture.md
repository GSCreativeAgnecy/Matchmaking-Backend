# Architecture Design

## 1. Overall Architecture

Modular layered application:

```
API layer (FastAPI routers) -> Schemas (Pydantic) -> Services (business logic)
        -> Repositories (data access) -> SQLAlchemy ORM -> PostgreSQL
                           |-> Redis (rate limiting, cache, presence, denylist)
                           |-> Object storage (S3-compatible) for photos
                           |-> ARQ worker (background jobs)
```

- Routers contain **no business logic**; they parse/validate requests and return schema responses.
- Services contain business rules and orchestration.
- Repositories encapsulate query construction for reuse.
- Pydantic schemas are the only payloads crossing the API boundary (never raw ORM objects).

## 2. Table List

| Domain | Tables |
| --- | --- |
| Auth / Account | `users` |
| Profile | `profiles`, `user_privacy_settings` |
| Photos | `photos` |
| Languages | `languages`, `user_languages` |
| Interests | `interests`, `user_interests` |
| Family | `families`, `family_members` |
| Astrology | `astrology_profiles` |
| Preferences | `partner_preferences`, `preferred_religions`, `preferred_castes`, `preferred_languages`, `preferred_countries`, `preferred_states`, `preferred_diets` |
| Discovery | `swipes`, `matches` |
| Messaging | `conversations`, `conversation_participants`, `messages` |
| Blocks / Reports | `blocks`, `reports` |
| Notifications | `notifications` |
| Monetization | `subscription_plans`, `subscriptions`, `payments`, `job_verifications` |
| Sharing | `profile_shares` |
| Governance | `audit_logs` |
| Lookups (seeded) | `religions`, `castes`, `languages`, `countries`, `states`, `education_levels`, `occupations`, `interests`, `app_config` |

## 3. Enums

- `AccountStatus`: PENDING, ACTIVE, SUSPENDED, BANNED, DELETED
- `UserRole`: USER, MODERATOR, VERIFIER, ADMIN, SUPER_ADMIN
- `Gender`: MALE, FEMALE, OTHER
- `MaritalStatus`: NEVER_MARRIED, DIVORCED, WIDOWED, AWAITING_DIVORCE
- `Diet`: VEGETARIAN, NON_VEGETARIAN, EGGITARIAN, JAIN, VEGAN
- `Drinking`, `Smoking`: NEVER, OCCASIONALLY, REGULARLY, PREFER_NOT_TO_SAY
- `PhysicalStatus`: NORMAL, PHYSICALLY_CHALLENGED
- `EmploymentStatus`: EMPLOYED, SELF_EMPLOYED, BUSINESS_OWNER, STUDENT, NOT_WORKING, RETIRED, HOMEMAKER
- `Intent`: MARRIAGE, FRIENDSHIP, DATE, NOT_SURE
- `ProfileCreatedBy`: SELF, PARENT, GUARDIAN, RELATIVE, FRIEND, PROFILE_SERVICE
- `BodyType`: SLIM, AVERAGE, ATHLETIC, HEAVY
- `Complexion`: FAIR, WHEATISH, DARK, VERY_FAIR, MIDDLE_BROWN
- `PhotoVerificationStatus`: UNVERIFIED, PENDING, VERIFIED, REJECTED
- `PhotoVisibility`: PUBLIC, PRIVATE
- `PreferenceLevel`: REQUIRED, PREFERRED, NO_PREFERENCE
- `SwipeAction`: LIKE, PASS, SUPER_LIKE
- `MatchStatus`: ACTIVE, UNMATCHED, BLOCKED, EXPIRED
- `MessageType`: TEXT, IMAGE, SYSTEM
- `ReportStatus`: PENDING, UNDER_REVIEW, RESOLVED, DISMISSED
- `ReportReason`: FAKE_PROFILE, SCAM, HARASSMENT, INAPPROPRIATE_CONTENT, SPAM, UNDERAGE, IMPERSONATION, OTHER
- `NotificationType`: NEW_MATCH, NEW_MESSAGE, NEW_LIKE, PROFILE_VIEW, VERIFICATION_COMPLETE, SUBSCRIPTION_EXPIRING, SYSTEM
- `SubscriptionStatus`: TRIAL, ACTIVE, PAST_DUE, CANCELED, EXPIRED
- `PaymentStatus`: PENDING, SUCCESS, FAILED, REFUNDED, CANCELLED
- `PaymentType`: SUBSCRIPTION, JOB_VERIFICATION, OTHER
- `JobVerificationStatus`: PENDING_PAYMENT, UNDER_REVIEW, VERIFIED, REJECTED, EXPIRED
- `EmploymentType`: LOCAL, NRI
- `SharePermission`: VIEW, CONTACT, MANAGE
- `FamilyType`: JOINT, NUCLEAR, EXTENDED
- `AstrologyDosham`: NONE, MANGAL, PARTHIV, OTHER

## 4. Foreign Keys (main)

- `profiles.user_id` -> `users.id` (unique, cascade delete)
- `user_privacy_settings.user_id` -> `users.id` (unique)
- `photos.user_id` -> `users.id`
- `user_languages.user_id`/`language_id` (unique pair)
- `user_interests.user_id`/`interest_id` (unique pair)
- `families.user_id` -> `users.id` (unique)
- `family_members.user_id` -> `users.id`
- `astrology_profiles.user_id` -> `users.id` (unique)
- `partner_preferences.user_id` -> `users.id` (unique)
- preferred_* tables -> `partner_preferences.id`
- `swipes.from_user_id`/`to_user_id` -> `users.id` (unique `(from, to, action)` only for non-pass; pass rows may repeat)
- `matches.user1_id`/`user2_id` -> `users.id` (unique pair, normalized order `user1_id < user2_id`)
- `conversation_participants.conversation_id`/`user_id` (unique pair)
- `messages.conversation_id`, `messages.sender_id`
- `blocks.blocker_id`/`blocked_id` (unique pair)
- `reports.reporter_id`/`reported_user_id`
- `notifications.user_id`
- `subscriptions.user_id`/`plan_id`
- `payments.user_id`
- `job_verifications.user_id`, `payment_id`
- `profile_shares.owner_user_id`/`shared_with_user_id`
- `audit_logs.actor_user_id` (nullable for system actions)

## 5. Index Strategy

Functional indexes on hot query paths (see migration):
- `users`: email, phone_number, account_status, last_active_at, deleted_at
- `profiles`: user_id (unique), gender, date_of_birth, city, country, religion, caste, (gender, is_active, deleted_at)
- `swipes`: (from_user_id, to_user_id), to_user_id, (from_user_id, created_at) for feed ordering
- `matches`: user1_id, user2_id, (status)
- `messages`: (conversation_id, created_at), conversation_id + deleted_at
- `notifications`: (user_id, is_read), (user_id, created_at)
- `subscriptions`: (user_id, status), (plan_id, status)
- `payments`: provider_payment_id (unique), user_id, status
- `reports`: reported_user_id, status
- `job_verifications`: user_id, status
- `blocks`: (blocker_id, blocked_id) unique

## 6. Auth / Authorization Design

- Argon2id password hashing (argon2-cffi).
- JWT (HS256) access tokens (~15 min) + refresh tokens (~30 days) with rotation.
- Refresh token `jti` denylist in Redis; rotation revokes previous token.
- OTP verification for email/phone uses Redis-backed codes with expiry and rate limiting.
- RBAC roles on `users.role`: USER, MODERATOR, VERIFIER, ADMIN, SUPER_ADMIN.
- `current_user` dependency resolves token -> user; ownership checks in services.
- Client-supplied `user_id`, premium/payment/verification state is NEVER trusted; always derived server-side.

## 7. Recommendation Architecture

```
Candidate Generation (active, verified, eligible gender, not self)
        -> Hard Filters (religion REQUIRED, caste REQUIRED, age range, marital status,
                         location radius, exclude swiped/matched/blocked)
        -> Compatibility Scoring (weighted deterministic: age, height, location, religion,
                                  caste, mother tongue, education, occupation, diet,
                                  smoking, drinking, family values, interests, intent)
        -> Ranking (score desc)
        -> Feed (Redis-cached per user, TTL)
```
Returns `{candidate_user_id, score, reason_codes}`. The `ScoringEngine` is a replaceable protocol so an ML model can be swapped in later.

## 8. Payment / Verification Architecture

- `PaymentProvider` protocol (Stripe/Razorpay pluggable); webhooks are the only source of truth.
- Webhook signature verified; idempotent by `provider_payment_id`; `payments` + `subscriptions`/`job_verifications` transition atomically.
- Pricing from `app_config` table (e.g. `LOCAL_JOB_VERIFICATION=119`, `NRI_JOB_VERIFICATION=199`) — never hardcoded.
- `job_verifications` status machine: `PENDING_PAYMENT -> UNDER_REVIEW -> VERIFIED | REJECTED`. Only VERIFIER/ADMIN roles transition verification status.

## 9. Worker Architecture (ARQ)

Chosen **ARQ** over Celery because the codebase is fully async (`asyncpg`, `async` SQLAlchemy) and ARQ is Redis-native, async-first, and lightweight. Celery has poor asyncio support and adds heavyweight broker infra. Jobs run in a separate container via `arq worker.WorkerSettings`.

Jobs: send_email, send_sms, send_push_notification, expire_subscriptions, expire_profile_shares, expire_job_verifications, cleanup_deleted_accounts, process_photo (thumbnails), process_payment_webhook.

## 10. Database Notes

- UUID PKs (Postgres `gen_random_uuid()`).
- `timestamptz` everywhere; `JSONB` for structured payloads (via `JSON().with_variant(JSONB, "postgresql")` for portability to SQLite in tests).
- Soft delete on `users` (`deleted_at`, `account_status=DELETED`) with a background anonymization job.
- Check constraints for range validity (e.g. `age_min < age_max`).
