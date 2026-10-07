# AgriGPT Authentication Architecture

As a Principal Security Engineer, this document outlines the enterprise-grade authentication system designed for AgriGPT. Note: As the Firebase project setup was declined, this represents the intended architecture, while the current application uses a simulated mock authentication flow for UI demonstration purposes.

## 1. Authentication Flow

### Sign-up / Login Flow (OAuth & Email)
1. **Client Request:** User selects login method (Email/Password, Google, Phone OTP).
2. **Firebase Auth:** Client SDK securely communicates with Firebase Authentication.
3. **Token Issuance:** Upon success, Firebase issues an ID Token (JWT) and a Refresh Token.
4. **Backend Verification:** Client sends the ID Token in the `Authorization: Bearer <token>` header to the FastAPI backend.
5. **Session Management:** FastAPI verifies the token using the Firebase Admin SDK. If valid, the user's role and profile are fetched from Firestore.
6. **MFA (Multi-Factor Authentication):** If enrolled, Firebase enforces a secondary challenge (e.g., SMS OTP or Authenticator app) before issuing the final token.

### Token Refresh Flow
1. The short-lived ID Token expires (typically 1 hour).
2. The Firebase Client SDK automatically uses the secure Refresh Token to obtain a new ID Token.
3. The new token is sent in subsequent backend requests.

## 2. Database Design (Firestore)

### `users` Collection
Stores user profiles and RBAC (Role-Based Access Control) details.

```json
{
  "uid": "abc123xyz",
  "email": "farmer@example.com",
  "phoneNumber": "+1234567890",
  "displayName": "John Doe",
  "role": "farmer", // farmer | expert | gov_officer | researcher | admin
  "status": "active", // active | suspended | pending_verification
  "mfaEnabled": true,
  "lastLoginAt": "2023-10-27T10:00:00Z",
  "createdAt": "2023-01-15T08:30:00Z",
  "profile": {
    "farmSize": 50,
    "location": "MH-WEST-402",
    "primaryCrops": ["Wheat", "Soybean"]
  }
}
```

### `security_logs` Collection
Audits security events for enterprise compliance.

```json
{
  "logId": "log_987",
  "uid": "abc123xyz",
  "event": "LOGIN_SUCCESS", // LOGIN_FAILED, PASSWORD_RESET, MFA_ENABLED
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2023-10-27T10:00:00Z"
}
```

## 3. Role-Based Access Control (RBAC)

*   **Farmer:** Access to personal farm analytics, chat, market, and disease detection. Cannot access other users' data.
*   **Expert:** Access to aggregated (anonymized) region data, can respond to specific escalated queries.
*   **Government Officer:** Access to regional reporting, subsidy application reviews, and macro-level analytics.
*   **Researcher:** Read-only access to anonymized historical data for modeling.
*   **Admin:** Full system access, user management, and security audit logs.

## 4. Security Best Practices Implemented

1.  **Stateless Authentication:** FastAPI backend remains stateless; it verifies the Firebase JWT signature on every protected request.
2.  **Least Privilege:** Firestore Security Rules enforce that users can only read/write their own document (unless Admin/Expert).
3.  **Secure Middleware:** FastAPI utilizes `Depends()` for dependency injection to ensure `verify_token` is called before executing route logic.
4.  **MFA Support:** Enterprise requirement for Admin and Gov Officer roles to have MFA enforced.
5.  **Rate Limiting:** Backend endpoints for login and OTP generation are rate-limited to prevent brute-force attacks.
6.  **No Secrets in Frontend:** API keys in the frontend are restricted via Google Cloud Console to specific domains. Server-side secrets (Firebase Admin keys) are managed in Secret Manager.
