#!/usr/bin/env python3
"""Generates the GoTrue email templates in email-templates/ from ONE layout, so they can't drift.

    python3 deploy/build-email-templates.py          # rewrite the .html files
    python3 deploy/build-email-templates.py --check  # exit 1 if they are stale or break a rule

Code-only emails, no links: link scanners prefetch and burn one-time links, and every flow in
the app is code-based. GoTrue fills in {{ .Token }}. Table layout + inline CSS for mail clients.
The expiry line must match GOTRUE_MAILER_OTP_EXP in the compose files (600 s).
"""
from __future__ import annotations

import html
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent / "email-templates"
TOKEN = "{{ .Token }}"

# file name -> (heading, lead). Subjects are set in compose (GOTRUE_MAILER_SUBJECTS_*).
TEMPLATES = {
    # Sent when a guest (anonymous user) attaches an email: the register flow's step 1.
    "email-change.html": ("Verify your email", "Use this code to confirm your email and save your Veritas workspace."),
    "recovery.html": ("Reset your password", "Use this code to choose a new password."),
    # Only sent for a direct email sign-up, which the app doesn't offer; kept so GoTrue never
    # falls back to its default (link-based) template.
    "confirmation.html": ("Confirm your email", "Use this code to confirm your email address."),
}

LAYOUT = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{heading}</title></head>
<body style="margin:0;padding:0;background:#eef0f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f6;padding:32px 8px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="height:4px;line-height:4px;font-size:0;background:#2563eb;background-image:linear-gradient(90deg,#2563eb,#60a5fa);">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td width="36" height="36" align="center" valign="middle" style="width:36px;height:36px;border-radius:10px;background:#2563eb;color:#ffffff;font-size:18px;font-weight:700;">V</td>
<td style="padding-left:10px;font-size:16px;font-weight:600;color:#0f172a;">Veritas Research</td>
</tr></table>
</td></tr>
<tr><td style="padding:16px 28px 0 28px;font-size:22px;font-weight:700;color:#0f172a;">{heading}</td></tr>
<tr><td style="padding:8px 28px 0 28px;font-size:15px;line-height:22px;color:#475569;">{lead}</td></tr>
<tr><td align="center" style="padding:24px 16px;">
<div style="display:block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px 8px;font-family:'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;font-size:30px;line-height:40px;font-weight:700;letter-spacing:5px;color:#1e3a8a;white-space:nowrap;">{token}</div>
</td></tr>
<tr><td style="padding:0 28px 8px 28px;font-size:13px;line-height:20px;color:#64748b;">This code expires in 10 minutes. Never share this code with anyone, including people who say they are from Veritas.</td></tr>
<tr><td style="padding:0 28px 32px 28px;font-size:13px;line-height:20px;color:#64748b;">If you didn't request this, you can safely ignore this email.</td></tr>
</table>
</td></tr></table>
</body></html>
"""


def render(heading: str, lead: str) -> str:
    return LAYOUT.format(heading=html.escape(heading), lead=html.escape(lead), token=TOKEN)


def problems(name: str, text: str) -> list[str]:
    out = []
    actions = re.findall(r"\{\{.*?\}\}", text)
    if actions != [TOKEN]:
        out.append(f"{name}: template actions must be exactly [{TOKEN}], got {actions}")
    if re.search(r"https?:|<a\b|<img\b|<script\b|<link\b|@import|url\(", text, re.I):
        out.append(f"{name}: contains a link, remote resource or script")
    if len(text.encode()) >= 10_000:
        out.append(f"{name}: {len(text.encode())} bytes (keep under 10 KB)")
    for tag in ("table", "tr", "td", "div", "html", "body", "head"):
        opened = len(re.findall(rf"<{tag}\b", text))
        closed = len(re.findall(rf"</{tag}>", text))
        if opened != closed:
            out.append(f"{name}: <{tag}> opened {opened}x, closed {closed}x")
    return out


def main(argv: list[str]) -> int:
    check = "--check" in argv
    failures = []
    for name, (heading, lead) in TEMPLATES.items():
        text = render(heading, lead)
        failures += problems(name, text)
        path = HERE / name
        if check:
            if not path.exists() or path.read_text() != text:
                failures.append(f"{name}: stale, run build-email-templates.py")
        else:
            path.write_text(text)
    for f in failures:
        print(f, file=sys.stderr)
    if not failures:
        print("email templates OK" if check else f"wrote {len(TEMPLATES)} templates")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
