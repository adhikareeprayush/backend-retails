"""
Browser-friendly API explorer for Backend Mart.
HTTP calls use Python `requests` on Streamlit's server (not subject to browser CORS).

Streamlit Cloud: set secret STREAMLIT_API_BASE_URL = https://your-api.vercel.app
Local: streamlit run streamlit_app/app.py
"""

from __future__ import annotations

import json
import os
from typing import Any

import requests
import streamlit as st

DEFAULT_API_BASE = os.environ.get(
    "STREAMLIT_API_BASE_URL",
    "http://127.0.0.1:5000",
).rstrip("/")

st.set_page_config(
    page_title="Backend Mart · API docs & tester",
    page_icon="🛒",
    layout="wide",
    initial_sidebar_state="expanded",
)

if "jwt_token" not in st.session_state:
    st.session_state.jwt_token = ""

st.title("Backend Mart API")
st.caption(
    "Documentation and interactive checks in the browser. Requests run from Streamlit's Python server."
)

st.error(
    "**Live / hosted API:** SMTP email, password-reset mail, and outbound notifications **do not work** "
    "unless the API deployment includes valid mail credentials. Treat **email as disabled** on public URLs."
)

st.warning(
    "**CORS:** Browser JavaScript on other domains is blocked unless that origin is listed in the API's "
    "`ALLOWED_ORIGINS`. This Streamlit tool uses server-side HTTP, so it can still reach your API for demos."
)

with st.sidebar:
    st.header("Connection")
    api_base = st.text_input(
        "API base URL",
        value=DEFAULT_API_BASE,
        help="No trailing slash, e.g. https://your-project.vercel.app",
    ).rstrip("/")

    if st.session_state.jwt_token:
        st.success("JWT stored for this session.")
        if st.button("Clear JWT"):
            st.session_state.jwt_token = ""
            st.rerun()
    else:
        st.info("Register or log in below to save a JWT automatically.")


def api_url(path: str) -> str:
    p = path if path.startswith("/") else f"/{path}"
    return f"{api_base}{p}"


def api_request(
    method: str,
    path: str,
    *,
    json_body: dict[str, Any] | None = None,
    use_auth: bool = True,
    timeout: int = 45,
) -> requests.Response:
    headers = {"Accept": "application/json"}
    if json_body is not None:
        headers["Content-Type"] = "application/json"
    if use_auth and st.session_state.jwt_token:
        headers["Authorization"] = f"Bearer {st.session_state.jwt_token}"
    return requests.request(
        method.upper(),
        api_url(path),
        headers=headers,
        json=json_body,
        timeout=timeout,
    )


def show_response(title: str, resp: requests.Response) -> None:
    st.subheader(title)
    st.caption(f"`{resp.request.method} {resp.url}` → HTTP {resp.status_code}")
    try:
        st.json(resp.json())
    except ValueError:
        st.code(resp.text[:8000] or "(empty body)", language="text")


tab_intro, tab_try, tab_openapi = st.tabs(
    ["Overview & links", "Try endpoints", "OpenAPI spec"]
)

with tab_intro:
    st.markdown(
        """
### Quick links (open on the API host)
- **Landing page** — human-readable intro at `/`
- **Swagger UI** — interactive docs at `/api/docs`
- **OpenAPI JSON** — machine-readable spec at `/openapi.json`

### Notes
- Rate limiting may apply under `/api/`; health and OpenAPI root are outside that prefix where configured.
- Protect production data: this tester creates **real** users when you click register.
"""
    )
    st.markdown(f"- [Swagger UI]({api_base}/api/docs)")
    st.markdown(f"- [Landing]({api_base}/)")
    st.markdown(f"- [OpenAPI JSON]({api_base}/openapi.json)")

with tab_try:
    col1, col2 = st.columns(2)
    with col1:
        if st.button("GET /health"):
            try:
                show_response("Response", api_request("GET", "/health", use_auth=False))
            except requests.RequestException as e:
                st.exception(e)
        if st.button("GET /api"):
            try:
                show_response("Response", api_request("GET", "/api", use_auth=False))
            except requests.RequestException as e:
                st.exception(e)

    with col2:
        st.markdown("**Register** (writes to the live database)")
        reg_name = st.text_input("Name", value="Streamlit Demo User")
        reg_email = st.text_input("Email", value=f"demo-{os.getpid()}@example.com")
        reg_pass = st.text_input("Password", type="password", value="demo-pass-123")
        reg_role = st.selectbox("Role", ["user", "admin"], index=0)

        if st.button("POST /api/v1/auth/register"):
            try:
                r = api_request(
                    "POST",
                    "/api/v1/auth/register",
                    json_body={
                        "name": reg_name,
                        "email": reg_email,
                        "password": reg_pass,
                        "role": reg_role,
                    },
                    use_auth=False,
                )
                show_response("Register response", r)
                try:
                    tok = r.json().get("data", {}).get("token")
                    if tok:
                        st.session_state.jwt_token = tok
                        st.success("JWT saved for this session.")
                except (ValueError, TypeError, AttributeError):
                    pass
            except requests.RequestException as e:
                st.exception(e)

        st.markdown("**Login**")
        login_email = st.text_input("Login email", key="lem")
        login_pass = st.text_input("Login password", type="password", key="lpw")
        if st.button("POST /api/v1/auth/login"):
            try:
                r = api_request(
                    "POST",
                    "/api/v1/auth/login",
                    json_body={"email": login_email, "password": login_pass},
                    use_auth=False,
                )
                show_response("Login response", r)
                try:
                    tok = r.json().get("data", {}).get("token")
                    if tok:
                        st.session_state.jwt_token = tok
                        st.success("JWT saved for this session.")
                except (ValueError, TypeError, AttributeError):
                    pass
            except requests.RequestException as e:
                st.exception(e)

        if st.button("GET /api/v1/auth/me"):
            try:
                show_response("Me response", api_request("GET", "/api/v1/auth/me"))
            except requests.RequestException as e:
                st.exception(e)

        if st.button("POST /api/v1/auth/logout"):
            try:
                show_response(
                    "Logout response",
                    api_request("POST", "/api/v1/auth/logout", use_auth=False),
                )
            except requests.RequestException as e:
                st.exception(e)

with tab_openapi:
    st.markdown(f"Fetches `{api_base}/openapi.json`")
    if st.button("Fetch OpenAPI JSON"):
        try:
            r = requests.get(api_url("/openapi.json"), timeout=45)
            st.caption(f"HTTP {r.status_code}")
            spec = r.json()
            st.download_button(
                "Download openapi.json",
                data=json.dumps(spec, indent=2),
                file_name="openapi.json",
                mime="application/json",
            )
            with st.expander("Browse spec", expanded=False):
                st.json(spec)
        except requests.RequestException as e:
            st.exception(e)
        except json.JSONDecodeError as e:
            st.error(f"Invalid JSON: {e}")
