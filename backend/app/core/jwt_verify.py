# app/core/jwt_verify.py
"""Verify Supabase Auth (GoTrue) access tokens: HS256 with the shared JWT secret (our
self-hosted setup), or ES256/RS256 via the server's JWKS."""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

import jwt
from jwt import PyJWKClient

ASYMMETRIC_ALGS = ["ES256", "RS256"]
AUDIENCE = "authenticated"


class TokenError(Exception):
    """Raised for any reason a token can't be trusted."""


class SupabaseTokenVerifier:
    def __init__(self, supabase_url: str = "", jwt_secret: str = "") -> None:
        self._jwt_secret = jwt_secret
        # PyJWKClient caches keys and refetches on an unknown `kid` (key rotation).
        self._jwks = (
            PyJWKClient(f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json", cache_keys=True)
            if supabase_url
            else None
        )

    def verify(self, token: str) -> dict[str, Any]:
        try:
            alg = jwt.get_unverified_header(token).get("alg")

            if alg == "HS256":
                if not self._jwt_secret:
                    raise TokenError("HS256 token received but SUPABASE_JWT_SECRET is not configured")
                key: Any = self._jwt_secret
                algorithms = ["HS256"]
            elif alg in ASYMMETRIC_ALGS:
                if self._jwks is None:
                    raise TokenError("Asymmetric token received but SUPABASE_URL is not configured")
                key = self._jwks.get_signing_key_from_jwt(token).key
                algorithms = ASYMMETRIC_ALGS
            else:
                raise TokenError(f"Unsupported token algorithm: {alg!r}")

            return jwt.decode(
                token,
                key,
                algorithms=algorithms,
                audience=AUDIENCE,
                options={"require": ["exp", "sub"]},
            )
        except TokenError:
            raise
        except jwt.PyJWTError as exc:
            raise TokenError(str(exc)) from exc

@dataclass(frozen=True)
class AuthIdentity:
    user_id: uuid.UUID
    session_id: uuid.UUID | None
    email: str | None
    is_anonymous: bool


def identity_from_claims(claims: dict[str, Any]) -> AuthIdentity:
    """Turn verified GoTrue access-token claims into who is calling.

    Only user tokens are accepted: GoTrue signs them with role "authenticated" (the
    anon and service_role API keys share the secret, but carry other roles and no sub).
    """
    if claims.get("role") != "authenticated":
        raise TokenError("not a user token")
    try:
        user_id = uuid.UUID(str(claims["sub"]))
    except (KeyError, ValueError) as exc:
        raise TokenError("sub is not a uuid") from exc

    raw_sid = claims.get("session_id")
    try:
        session_id = uuid.UUID(str(raw_sid)) if raw_sid else None
    except ValueError as exc:
        raise TokenError("session_id is not a uuid") from exc

    is_anonymous = claims.get("is_anonymous") is True
    email = claims.get("email")
    # A guest has no address; never store one for them.
    email = email if isinstance(email, str) and email and not is_anonymous else None
    return AuthIdentity(user_id=user_id, session_id=session_id, email=email, is_anonymous=is_anonymous)
