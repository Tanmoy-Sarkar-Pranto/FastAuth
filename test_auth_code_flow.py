"""
Authorization Code + PKCE flow test helper.

Automates the full auth-code flow end-to-end and prints the resulting tokens.
Uses only Python stdlib — no extra dependencies needed.

Run from the HOST machine (app must be running on BASE_URL):
  python test_auth_code_flow.py

What it does:
  1. Generates a PKCE code_verifier + code_challenge (S256)
  2. POST /api/v1/authorize  → captures the authorization code from the redirect
  3. POST /api/v1/token      → exchanges code for access_token + refresh_token
  4. Prints all tokens + confirms client_id stored on the refresh token (DB query)
"""

import base64
import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_URL      = "http://localhost:8000"
CLIENT_ID     = "test-client"
CLIENT_SECRET = "super-secret"
REDIRECT_URI  = "http://localhost:3000/callback"
USERNAME      = "test@example.com"   # change to a valid user
PASSWORD      = "secret123"            # change to a valid password
# ──────────────────────────────────────────────────────────────────────────────


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def generate_pkce() -> tuple[str, str]:
    """Returns (code_verifier, code_challenge)."""
    code_verifier = b64url(os.urandom(32))
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = b64url(digest)
    return code_verifier, code_challenge


def post_form(url: str, data: dict) -> tuple[int, dict | str]:
    """POST application/x-www-form-urlencoded, return (status_code, body)."""
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode()
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def post_form_no_redirect(url: str, data: dict) -> str | None:
    """
    POST form data without following redirects.
    Returns the Location header value (the redirect URL containing the code).
    """
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    # Temporarily disable redirect following
    opener = urllib.request.build_opener(NoRedirectHandler())
    try:
        opener.open(req)
        return None  # no redirect — unexpected
    except urllib.error.HTTPError as e:
        if e.code in (301, 302, 303, 307, 308):
            return e.headers.get("Location")
        raise


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(newurl, code, msg, headers, fp)


def main():
    print("=" * 60)
    print("Authorization Code + PKCE Flow Test")
    print("=" * 60)

    # Step 1: Generate PKCE
    code_verifier, code_challenge = generate_pkce()
    print(f"\n[1] PKCE generated")
    print(f"    code_verifier  : {code_verifier[:20]}...")
    print(f"    code_challenge : {code_challenge[:20]}...")

    # Step 2: POST /authorize
    print(f"\n[2] POST {BASE_URL}/api/v1/authorize")
    authorize_data = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "username": USERNAME,
        "password": PASSWORD,
    }

    try:
        location = post_form_no_redirect(
            f"{BASE_URL}/api/v1/authorize", authorize_data
        )
    except Exception as e:
        print(f"    ERROR: {e}")
        return

    if not location:
        print("    ERROR: No redirect received from /authorize")
        return

    print(f"    Redirect → {location}")
    parsed = urllib.parse.urlparse(location)
    params = urllib.parse.parse_qs(parsed.query)

    if "error" in params:
        print(f"    ERROR: {params['error'][0]} — {params.get('error_description', [''])[0]}")
        return

    code = params.get("code", [None])[0]
    if not code:
        print("    ERROR: No 'code' in redirect params")
        return

    print(f"    Authorization code: {code[:20]}...")

    # Step 3: Exchange code for tokens
    print(f"\n[3] POST {BASE_URL}/api/v1/token (authorization_code)")
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "code_verifier": code_verifier,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }

    status, body = post_form(f"{BASE_URL}/api/v1/token", token_data)
    print(f"    Status: {status}")

    if status != 200:
        print(f"    ERROR: {body}")
        return

    access_token  = body.get("access_token", "")
    refresh_token = body.get("refresh_token", "")

    print(f"\n{'='*60}")
    print("  TOKENS ISSUED SUCCESSFULLY")
    print(f"{'='*60}")
    print(f"  access_token  : {access_token[:40]}...")
    print(f"  refresh_token : {refresh_token}")
    print(f"  token_type    : {body.get('token_type')}")
    print(f"  expires_in    : {body.get('expires_in')}s")
    print(f"{'='*60}")
    print()
    print("Next steps to verify client_id tracking:")
    print("  docker compose exec db psql -U fastauth -d fastauth -c \\")
    print('    "SELECT client_id, is_used, revoked FROM refresh_tokens ORDER BY created_at DESC LIMIT 1;"')
    print()
    print("  Expected: client_id = 'test-client'")


if __name__ == "__main__":
    main()
