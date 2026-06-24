# Security Guidelines & Hardening

This document explains the security architecture of **HireHub**, specific design trade-offs made in the authentication flow, and recommended practices for production deployments.

---

## JWT Storage Vulnerability (localStorage)

Currently, the client application stores authentication JWTs inside the browser's `localStorage` (configured in [axios.js](file:///e:/PROJECTs/1_Final/HireHub/client/src/api/axios.js)). While `localStorage` provides a simple, stateless implementation that works out-of-the-box across local dev servers and mobile browsers, it is subject to the following vulnerabilities:

*   **Cross-Site Scripting (XSS):** Any script running on the page (from third-party libraries, CDN injection, or inline script injections) can read the contents of `localStorage` using `window.localStorage.getItem('token')`. If compromised, the attacker can hijack the user's session.

---

## Production Security Recommendations

To secure authentication for production environments, it is highly recommended to migrate the JWT storage mechanism from `localStorage` to **Secure HttpOnly Cookies**:

### 1. Secure Cookies
*   **HttpOnly Flag:** Storing the JWT inside an HTTP cookie with the `HttpOnly` flag set to `true`. This prevents client-side JavaScript from reading or writing the cookie, completely mitigating XSS token extraction.
*   **Secure Flag:** Ensure the cookie is only transmitted over encrypted (HTTPS) connections by setting the `Secure` flag.
*   **SameSite Attribute:** Set `SameSite=Strict` or `SameSite=Lax` to prevent the cookie from being sent along with cross-site requests, mitigating many standard Cross-Site Request Forgery (CSRF) vectors.

### 2. CSRF Token Swap
Because cookies are automatically attached to matching domain requests by the browser, migrating to cookies introduces vulnerability to CSRF attacks. To defend against this:
*   Implement a **double-submit cookie pattern** or a custom header checker.
*   Generate a unique cryptographically secure anti-CSRF token on the server during session initialization.
*   Store it in a client-readable cookie or session, and require the client to send it back via a custom HTTP request header (e.g., `X-CSRF-Token`) on all state-changing requests (`POST`, `PUT`, `DELETE`).
*   Verify the header token against the cookie token on the server.

### 3. Rate Limiting
*   Keep the rate-limiting middleware (`express-rate-limit`) active on auth endpoints to prevent brute-force attacks.
*   Monitor login patterns for credential stuffing.
