"""python3 -m unittest discover -s deploy/tests   (standard library only)"""
import importlib.util
import os
import stat
import tempfile
import time
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location("gen_secrets", Path(__file__).resolve().parents[1] / "gen-secrets.py")
gs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gs)


def filled(values=None):
    v = gs.parse_env(gs.render(values or gs.generate_values()))
    v.update(AUTH_IMAGE="supabase/gotrue:v2.196.0", CLOUDFLARE_TUNNEL_TOKEN="t", ANTHROPIC_API_KEY="k",
             EDGAR_USER_AGENT="Veritas me@example.com", SMTP_PASS="re_x")
    return v


class GenSecrets(unittest.TestCase):
    def test_fresh_template_flags_every_changeme(self):
        problems = gs.check(gs.parse_env(gs.render(gs.generate_values())))
        for key in ("AUTH_IMAGE", "CLOUDFLARE_TUNNEL_TOKEN", "ANTHROPIC_API_KEY", "SMTP_PASS", "EDGAR_USER_AGENT"):
            self.assertTrue(any(key in p and "CHANGEME" in p for p in problems), key)

    def test_filled_file_passes(self):
        self.assertEqual(gs.check(filled()), [])

    def test_passwords_unique_alnum_32(self):
        v = gs.generate_values()
        pws = [v[k] for k in gs.PASSWORDS]
        self.assertEqual(len(set(pws)), 4)
        for p in pws:
            self.assertEqual(len(p), 32)
            self.assertTrue(p.isalnum())

    def test_keys_have_role_and_no_sub_or_aud(self):
        v = gs.generate_values()
        for key, role in (("ANON_KEY", "anon"), ("SERVICE_ROLE_KEY", "service_role")):
            claims = gs.verify_jwt(v[key], v["JWT_SECRET"])
            self.assertEqual(claims["role"], role)
            self.assertNotIn("sub", claims)
            self.assertNotIn("aud", claims)
            self.assertGreater(claims["exp"], time.time() + 9 * 365 * 24 * 3600)

    def test_tampering_detected(self):
        v = filled()
        head, body, sig = v["ANON_KEY"].split(".")
        forged = gs.b64url(gs.b64url_decode(body).replace(b'"anon"', b'"service_role"'))
        v["ANON_KEY"] = f"{head}.{forged}.{sig}"
        self.assertTrue(any("ANON_KEY does not verify" in p for p in gs.check(v)))

    def test_wrong_secret_detected(self):
        v = filled()
        v["JWT_SECRET"] = "0" * 64
        self.assertTrue(any("does not verify" in p for p in gs.check(v)))

    def test_bad_domain_and_floating_image(self):
        v = filled()
        v["DOMAIN"] = "https://veritas.ayandev.app/"
        v["AUTH_IMAGE"] = "supabase/gotrue:latest"
        problems = gs.check(v)
        self.assertTrue(any(p.startswith("DOMAIN") for p in problems))
        self.assertTrue(any(p.startswith("AUTH_IMAGE") for p in problems))

    def test_duplicate_passwords_detected(self):
        v = filled()
        v["REDIS_PASSWORD"] = v["APP_DB_PASSWORD"]
        self.assertIn("the four passwords must all be different", gs.check(v))

    def test_write_is_0600_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / ".env"
            gs.write_env(path)
            self.assertEqual(stat.S_IMODE(os.stat(path).st_mode), 0o600)
            before = path.read_text()
            with self.assertRaises(FileExistsError):
                gs.write_env(path)
            self.assertEqual(path.read_text(), before)


if __name__ == "__main__":
    unittest.main()
