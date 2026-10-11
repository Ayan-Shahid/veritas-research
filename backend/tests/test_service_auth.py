"""Service-token and registered-user guards, and the production docs switch (no database needed)."""
import uuid

import pytest
from fastapi import HTTPException

from app.core import auth
from app.core.config import Settings
from app.models.user import User


def test_service_token_fails_closed_when_unset(monkeypatch):
    monkeypatch.setattr(auth.settings, "SERVICE_API_TOKEN", "")
    with pytest.raises(HTTPException) as e:
        auth.require_service_token("anything")
    assert e.value.status_code == 503


@pytest.mark.parametrize("sent", [None, "", "wrong", "s3cret-token-but-longer"])
def test_service_token_rejects_missing_or_wrong(monkeypatch, sent):
    monkeypatch.setattr(auth.settings, "SERVICE_API_TOKEN", "s3cret-token")
    with pytest.raises(HTTPException) as e:
        auth.require_service_token(sent)
    assert e.value.status_code == 401


def test_service_token_accepts_exact_match(monkeypatch):
    monkeypatch.setattr(auth.settings, "SERVICE_API_TOKEN", "s3cret-token")
    assert auth.require_service_token("s3cret-token") is None


@pytest.mark.anyio
async def test_registered_user_guard():
    guest = User(id=uuid.uuid4(), is_anonymous=True)
    member = User(id=uuid.uuid4(), is_anonymous=False)
    with pytest.raises(HTTPException) as e:
        await auth.get_registered_user(guest)
    assert e.value.status_code == 403
    assert await auth.get_registered_user(member) is member


@pytest.mark.parametrize(
    ("env", "override", "expected"),
    [("production", None, False), ("local", None, True), ("production", True, True), ("local", False, False)],
)
def test_docs_enabled(env, override, expected):
    assert Settings(ENV=env, API_DOCS_ENABLED=override).docs_enabled is expected
