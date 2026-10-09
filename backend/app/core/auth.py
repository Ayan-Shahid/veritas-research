# app/core/auth.py
"""Authenticate API requests with Supabase Auth (GoTrue) access tokens.

GoTrue (self-hosted, sharing this Postgres) owns users, credentials and sessions. The
browser sends its access token as `Authorization: Bearer <jwt>`; we verify the signature
locally and then ask the database whether the token's session still exists, so sign-out,
"sign out other devices" and a password change cut off API access at once instead of
when the token expires (GOTRUE_JWT_EXP).
"""
from fastapi import Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.jwt_verify import AuthIdentity, SupabaseTokenVerifier, TokenError, identity_from_claims
from app.models.organization import Organization
from app.models.user import User

_verifier = SupabaseTokenVerifier(supabase_url=settings.SUPABASE_URL, jwt_secret=settings.SUPABASE_JWT_SECRET)

# A SECURITY DEFINER function created by deploy/initdb/01-bootstrap.sh. The app's database
# role can call it but cannot read GoTrue's tables (password hashes, refresh tokens) itself.
_SESSION_ACTIVE_SQL = text("SELECT auth_bridge.session_is_active(:sid, :uid)")


def _unauthorized(detail: str = "Invalid or expired session") -> HTTPException:
    return HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization or authorization[:7].lower() != "bearer ":
        return None
    token = authorization[7:].strip()
    return token or None


async def _session_is_active(db: AsyncSession, identity: AuthIdentity) -> bool:
    if identity.session_id is None:
        return False
    result = await db.execute(_SESSION_ACTIVE_SQL, {"sid": identity.session_id, "uid": identity.user_id})
    return result.scalar() is True


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = _bearer_token(request.headers.get("Authorization"))
    if token is None:
        raise _unauthorized("Not authenticated")

    try:
        identity = identity_from_claims(_verifier.verify(token))
    except TokenError as exc:
        raise _unauthorized() from exc

    if settings.AUTH_SESSION_CHECK and not await _session_is_active(db, identity):
        raise _unauthorized()

    user = await db.get(User, identity.user_id)
    if user is None:
        return await _provision_user(db, identity)

    # A guest who registers keeps the same id; only these two fields change.
    if user.is_anonymous != identity.is_anonymous or (identity.email and user.email != identity.email):
        user.is_anonymous = identity.is_anonymous
        if identity.email:
            user.email = identity.email
        await db.commit()
    return user


async def _provision_user(db: AsyncSession, identity: AuthIdentity) -> User:
    """First request from this auth user: create their personal workspace."""
    user_id, email = identity.user_id, identity.email
    try:
        org = Organization(
            name=email.split("@")[0] if email else "New Workspace",
            slug=f"ws-{str(user_id)[:8]}",
        )
        db.add(org)
        await db.flush()
        user = User(id=user_id, organization_id=org.id, email=email, is_anonymous=identity.is_anonymous)
        db.add(user)
        await db.commit()
    except IntegrityError:
        # A concurrent first-load request won the race and already created
        # this user (and its org); ours rolled back with it. Use theirs.
        await db.rollback()
        existing = await db.get(User, user_id)
        if existing is None:
            raise
        return existing
    await db.refresh(user)
    return user
