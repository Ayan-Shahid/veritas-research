import hashlib, hmac, json, base64, time, uuid

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.core.jwt_verify import SupabaseTokenVerifier, TokenError

SECRET = "super-secret-legacy-value-0123456789abcdef"
SUB = str(uuid.uuid4())


def claims(**kw):
    base = {"sub": SUB, "aud": "authenticated", "exp": int(time.time()) + 600, "is_anonymous": True}
    base.update(kw)
    return base


@pytest.fixture
def ec_pair():
    priv = ec.generate_private_key(ec.SECP256R1())
    return priv, priv.public_key()


class FakeJWKS:
    def __init__(self, pub): self.pub = pub
    def get_signing_key_from_jwt(self, token):
        class K: pass
        k = K(); k.key = self.pub
        return k


def make(ec_pub=None, secret=""):
    v = SupabaseTokenVerifier(supabase_url="https://x.supabase.co" if ec_pub else "", jwt_secret=secret)
    if ec_pub:
        v._jwks = FakeJWKS(ec_pub)
    return v


def test_hs256_ok():
    t = jwt.encode(claims(), SECRET, algorithm="HS256")
    assert make(secret=SECRET).verify(t)["sub"] == SUB

def test_hs256_wrong_secret():
    t = jwt.encode(claims(), "other" * 10, algorithm="HS256")
    with pytest.raises(TokenError): make(secret=SECRET).verify(t)

def test_es256_ok(ec_pair):
    priv, pub = ec_pair
    t = jwt.encode(claims(), priv, algorithm="ES256", headers={"kid": "k1"})
    assert make(ec_pub=pub).verify(t)["is_anonymous"] is True

def test_es256_wrong_key(ec_pair):
    priv, _ = ec_pair
    other = ec.generate_private_key(ec.SECP256R1()).public_key()
    t = jwt.encode(claims(), priv, algorithm="ES256")
    with pytest.raises(TokenError): make(ec_pub=other).verify(t)

def test_expired():
    t = jwt.encode(claims(exp=int(time.time()) - 10), SECRET, algorithm="HS256")
    with pytest.raises(TokenError): make(secret=SECRET).verify(t)

def test_wrong_audience():
    t = jwt.encode(claims(aud="anon"), SECRET, algorithm="HS256")
    with pytest.raises(TokenError): make(secret=SECRET).verify(t)

def test_missing_exp():
    c = claims(); del c["exp"]
    t = jwt.encode(c, SECRET, algorithm="HS256")
    with pytest.raises(TokenError): make(secret=SECRET).verify(t)

def test_alg_none_rejected():
    t = jwt.encode(claims(), None, algorithm="none")
    with pytest.raises(TokenError): make(secret=SECRET).verify(t)

def test_hs256_confusion_with_public_key(ec_pair):
    # attacker hand-forges an HS256 token keyed with the public EC key PEM
    _, pub = ec_pair
    pem = pub.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = b64(json.dumps(claims()).encode())
    sig = b64(hmac.new(pem, f"{head}.{body}".encode(), hashlib.sha256).digest())
    with pytest.raises(TokenError): make(ec_pub=pub).verify(f"{head}.{body}.{sig}")

def test_hs256_without_secret_configured():
    t = jwt.encode(claims(), SECRET, algorithm="HS256")
    with pytest.raises(TokenError): make().verify(t)

def test_garbage():
    with pytest.raises(TokenError): make(secret=SECRET).verify("not.a.jwt")

# --- identity_from_claims: what a verified GoTrue token means for the API -----------------

from app.core.jwt_verify import identity_from_claims  # noqa: E402

SID = str(uuid.uuid4())


def user_claims(**kw):
    base = {"sub": SUB, "role": "authenticated", "session_id": SID, "email": "a@b.co", "is_anonymous": False}
    base.update(kw)
    return base


def test_identity_member():
    ident = identity_from_claims(user_claims())
    assert str(ident.user_id) == SUB and str(ident.session_id) == SID
    assert ident.email == "a@b.co" and ident.is_anonymous is False


def test_identity_guest_never_has_email():
    ident = identity_from_claims(user_claims(is_anonymous=True, email="leak@x.co"))
    assert ident.is_anonymous is True and ident.email is None


def test_identity_guest_flag_must_be_true_boolean():
    assert identity_from_claims(user_claims(is_anonymous="true")).is_anonymous is False


def test_identity_empty_email_is_none():
    assert identity_from_claims(user_claims(email="")).email is None


@pytest.mark.parametrize("role", ["anon", "service_role", None, "supabase_admin"])
def test_identity_rejects_non_user_roles(role):
    with pytest.raises(TokenError):
        identity_from_claims(user_claims(role=role))


def test_identity_rejects_bad_sub():
    with pytest.raises(TokenError):
        identity_from_claims(user_claims(sub="not-a-uuid"))


def test_identity_rejects_bad_session_id():
    with pytest.raises(TokenError):
        identity_from_claims(user_claims(session_id="nope"))


def test_identity_missing_session_id_is_none():
    c = user_claims()
    del c["session_id"]
    assert identity_from_claims(c).session_id is None


def test_api_keys_are_never_user_tokens():
    # Shaped like deploy/gen-secrets.py output: role + iss + iat + exp, no sub, no aud.
    now = int(time.time())
    v = make(secret=SECRET)
    for role in ("anon", "service_role"):
        key = jwt.encode({"role": role, "iss": "supabase", "iat": now, "exp": now + 3600}, SECRET, algorithm="HS256")
        with pytest.raises(TokenError):
            identity_from_claims(v.verify(key))
