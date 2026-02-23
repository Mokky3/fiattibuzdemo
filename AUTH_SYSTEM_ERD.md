# Authentication System Data Model (ERD) - Auth Pages

## Overview
This document maps the relationships and data flow for authentication pages: SignIn, SignUp, Register (Create Account), Forgot Password, and Reset Password.

---

## 1. FRONTEND COMPONENTS

### 1.1 SignIn Component (`frontend/src/components/Auth/SignIn.jsx`)
**Purpose**: Unified login for all user roles

**API Calls**:
- `patientAuthAPI.login()` → `/api/v1/patient/auth/login` (for PATIENT role)
- `authAPI.login()` → `/api/v1/auth/login` (unified auth for all other roles)

**Data Flow**:
```
User Input (username/email, password)
  ↓
Try Patient Auth First (backward compatibility)
  ↓
If PATIENT role → Navigate to /patient/dashboard
  ↓
Else → Try Unified Auth
  ↓
Role-based Navigation:
  - SUPER_ADMIN/CLINIC_ADMIN → /admin/dashboard
  - DOCTOR → /doctor/dashboard
  - NURSE → /nurse/dashboard
  - RECEPTIONIST → /reception/dashboard
  - LAB_TECHNICIAN → /lab/dashboard
  - RADIOLOGIST → /radiology/dashboard
  - PATIENT → /patient/dashboard
```

**Storage**:
- `localStorage.setItem('token', access_token)`
- `localStorage.setItem('user', JSON.stringify(user))`

---

### 1.2 SignUp Component (`frontend/src/components/Auth/SignUp.jsx`)
**Purpose**: Patient self-registration (only PATIENT role allowed)

**API Call**:
- `patientAuthAPI.register()` → `/api/v1/patient/auth/register`

**Form Fields**:
- firstName, surname, pinfl (14 digits), phoneNumber (+998XXXXXXXXX), email, password, confirmPassword, termsAccepted

**Validation**:
- Email format validation
- PINFL: exactly 14 digits
- Phone: +998 followed by 9 digits (13 total)
- Password: min 8 chars, uppercase, lowercase, number, special char (@$!%*#?&)
- Password confirmation match

**Data Flow**:
```
Form Validation
  ↓
API Call: POST /api/v1/patient/auth/register
  ↓
Payload: {
  email, password, confirm_password,
  first_name, last_name, phone,
  date_of_birth, gender, national_id (PINFL),
  clinic_id
}
  ↓
Backend creates User + Patient records
  ↓
Returns tokens (access_token, refresh_token)
  ↓
Navigate to /signin
```

---

### 1.3 Register Component (`frontend/src/components/Auth/Register.jsx`)
**Purpose**: Staff registration via invitation token (DOCTOR, NURSE, ADMIN, etc.)

**API Calls**:
- `GET /auth/registration/validate-token/{token}` - Validate invitation
- `POST /auth/registration/` - Complete registration

**Data Flow**:
```
User clicks invitation link: /register?token={invitation_token}
  ↓
Validate Token: GET /auth/registration/validate-token/{token}
  ↓
If valid → Show form with pre-filled name, organization, role
  ↓
User enters password, confirm_password, first_name, last_name
  ↓
POST /auth/registration/ with token + password
  ↓
Backend creates User account, marks invitation as ACCEPTED
  ↓
Navigate to /signin
```

**Note**: This is for staff users only. Patients use SignUp.

---

### 1.4 ForgotPassword Component (`frontend/src/components/Auth/ForgotPassword.jsx`)
**Purpose**: Request password reset code

**API Calls**:
- `authAPI.validateEmail()` → `/api/v1/auth/validate-email` (debounced, 500ms)
- `authAPI.forgotPassword()` → `/api/v1/auth/forgot-password`

**Data Flow**:
```
User enters email
  ↓
Debounced email validation (500ms)
  ↓
POST /auth/validate-email → Check if email exists
  ↓
If exists → Show green checkmark
  ↓
User clicks "Send Reset Code"
  ↓
POST /auth/forgot-password
  ↓
Backend generates 6-digit code, sends email
  ↓
Navigate to /reset-password?email={email}
```

**Email Validation**:
- Real-time validation with visual feedback (✓ or ✗)
- Prevents submission if email doesn't exist

---

### 1.5 ResetPassword Component (`frontend/src/components/Auth/ResetPassword.jsx`)
**Purpose**: Reset password using code from email

**API Calls**:
- `authAPI.validateResetCode()` → `/api/v1/auth/validate-reset-code`
- `authAPI.resetPassword()` → `/api/v1/auth/reset-password`

**Data Flow**:
```
User arrives from /forgot-password with email param
  ↓
Step 1: Enter 6-digit code
  ↓
POST /auth/validate-reset-code (email, code)
  ↓
If valid → Show password reset form
  ↓
Step 2: Enter new password + confirm
  ↓
Password validation (same rules as SignUp)
  ↓
POST /auth/reset-password (email, code, new_password)
  ↓
Backend updates password_hash, marks code as used
  ↓
Success → Navigate to /signin after 3 seconds
```

**Two-Step Process**:
1. Code validation (6-digit numeric code)
2. Password reset (with full validation)

---

## 2. BACKEND ROUTES & ENDPOINTS

### 2.1 Unified Login (`backend/app/portals/auth/routes/public.py`)
**Endpoint**: `POST /api/v1/auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "DOCTOR",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true
  }
}
```

**Database Operations**:
1. Query `core.users` by email (case-insensitive) or username
2. Verify password using `AuthService.verify_password()`
3. Check `is_active` and `status == ACTIVE`
4. Update `last_login` timestamp
5. Create `UserActivity` record (activity_type="login")
6. Generate JWT token with user.id and role

**Relationships Used**:
- `User` → `UserActivity` (one-to-many, for audit trail)

---

### 2.2 Patient Login (`backend/app/portals/patient/routes/auth_public.py`)
**Endpoint**: `POST /api/v1/patient/auth/login`

**Request**:
```json
{
  "username_or_email": "patient@example.com",
  "password": "password123"
}
```

**Response**: Same as unified login

**Database Operations**:
1. Query `core.users` by email or username
2. **Role Check**: Must be `UserRole.PATIENT`
3. Verify password, check active status
4. Update `last_login`
5. Generate tokens with `clinic_id` if available

**Relationships Used**:
- `User` → `Patient` (one-to-one via `user_id`)

---

### 2.3 Patient Registration (`backend/app/portals/patient/routes/auth_public.py`)
**Endpoint**: `POST /api/v1/patient/auth/register`

**Request**:
```json
{
  "email": "patient@example.com",
  "password": "SecurePass123!",
  "confirm_password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+998901234567",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "national_id": "12345678901234",
  "clinic_id": "optional-uuid"
}
```

**Database Operations**:
1. Check if email exists in `core.users` → 409 Conflict if exists
2. Generate unique username from email
3. Hash password using `AuthService.get_password_hash()`
4. **Create User**:
   - Insert into `core.users` with `role=PATIENT`, `status=ACTIVE`
   - Set `organization_id` if `clinic_id` provided
5. **Create/Link Patient**:
   - Check if `Patient` exists by `national_id` (PINFL)
   - If exists and unlinked → Link to new user
   - If exists and linked to different user → 409 Conflict
   - If not exists → Create new `Patient` record
6. Generate access_token and refresh_token
7. Return tokens + user info

**Relationships Used**:
- `User` → `Patient` (one-to-one, `Patient.user_id` → `User.id`)
- `User` → `Hospital` (many-to-one, `User.organization_id` → `Hospital.id`)
- `Patient` → `User` (one-to-one, `Patient.user_id` → `User.id`)

**Constraints**:
- Email must be unique in `core.users`
- PINFL (national_id) must be unique in `patients` table
- One Patient can only be linked to one User

---

### 2.4 Staff Registration via Invitation (`backend/app/portals/auth/routes/registration.py`)
**Endpoint**: `POST /api/v1/auth/registration/`

**Request**:
```json
{
  "token": "invitation-token-uuid",
  "password": "SecurePass123!",
  "confirm_password": "SecurePass123!",
  "first_name": "Jane",
  "last_name": "Smith"
}
```

**Database Operations**:
1. Query `UserInvitation` by token
2. Validate invitation:
   - Not expired
   - Status is `PENDING` (not ACCEPTED or CANCELLED)
3. Check if user already exists with invitation contact (email/phone)
4. **Create User**:
   - Insert into `core.users` with role from invitation
   - Set `organization_id` from invitation
   - Hash password
5. **Mark Invitation as ACCEPTED**
6. Return success response

**Relationships Used**:
- `UserInvitation` → `User` (one-to-one, invitation creates user)
- `UserInvitation` → `Hospital` (many-to-one, `UserInvitation.organization_id` → `Hospital.id`)

**Token Validation Endpoint**: `GET /api/v1/auth/registration/validate-token/{token}`
- Returns invitation details (contact, role, organization_name, expires_at)

---

### 2.5 Forgot Password (`backend/app/portals/auth/routes/password_reset.py`)
**Endpoint**: `POST /api/v1/auth/forgot-password`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Database Operations**:
1. Query `core.users` by email (case-insensitive)
2. If user exists:
   - Generate 6-digit numeric reset code
   - Store code in memory (in production: Redis/DB) with:
     - `user_id`, `email`, `expires_at` (15 minutes), `used` flag
   - Send email with reset code
3. **Always return success** (security: don't reveal if email exists)

**In-Memory Storage** (should be Redis in production):
```python
password_reset_codes[code] = {
    "user_id": "uuid",
    "email": "user@example.com",
    "expires_at": datetime,
    "used": False
}
```

**Email Validation Endpoint**: `POST /api/v1/auth/validate-email`
- Returns `{exists: bool, message: string}`
- Used by frontend for real-time validation

---

### 2.6 Reset Password (`backend/app/portals/auth/routes/password_reset.py`)
**Endpoint**: `POST /api/v1/auth/reset-password`

**Request**:
```json
{
  "email": "user@example.com",
  "code": "123456",
  "new_password": "NewSecurePass123!"
}
```

**Database Operations**:
1. Verify reset code:
   - Check code exists in storage
   - Check not expired (15 minutes)
   - Check not already used
   - Check email matches
2. Query `core.users` by `user_id` from code
3. Validate new password (min 8 chars)
4. Hash new password using `AuthService.get_password_hash()`
5. Update `User.password_hash`
6. Update `User.updated_at`
7. Mark code as used
8. Commit transaction

**Code Validation Endpoint**: `POST /api/v1/auth/validate-reset-code`
- Returns `{valid: bool, message: string}`
- Used by frontend before showing password form

---

## 3. DATABASE MODELS & RELATIONSHIPS

### 3.1 Core User Model (`backend/app/common/models/user.py`)

**Table**: `core.users`

**Key Fields**:
- `id` (UUID, PK)
- `email` (String, unique, indexed, NOT NULL)
- `username` (String, unique, indexed, nullable)
- `password_hash` (String, NOT NULL)
- `first_name`, `last_name`, `middle_name`, `full_name`
- `phone` (String, nullable)
- `role` (Enum: UserRole)
- `status` (Enum: UserStatus: ACTIVE, INACTIVE, SUSPENDED, PENDING)
- `is_active` (Boolean, default=True)
- `email_verified`, `phone_verified` (Boolean)
- `two_factor_enabled`, `two_factor_secret`
- `organization_id` (FK → `ref.hospitals.id`)
- `department_id` (FK → `ref.hospital_departments.id`)
- `failed_login_attempts`, `locked_until`
- `password_changed_at`, `last_login`, `last_activity`
- `timezone`, `language`, `profile_image_url`
- `created_at`, `updated_at`

**Relationships**:
```python
# One-to-One
User → UserProfile (via user_id)
User → Doctor (via doctor_profile)
User → Nurse (via nurse_profile)
User → Patient (via patient_profile)
User → Practitioner (via practitioner)
User → UserSettings (via user_id)

# One-to-Many
User → UserSession (via user_id) - Login sessions
User → UserActivity (via user_id) - Audit trail
User → Notification (via recipient_id)
User → Message (via sender_id, recipient_id)
User → Todo (via created_by, assigned_to)
User → MedicalRecord (via created_by)
User → Prescription (via prescribed_by)

# Many-to-One
User → Hospital (via organization_id)
User → HospitalDepartment (via department_id, admin_department_id)
```

---

### 3.2 Patient Model (`backend/app/common/models/patient.py`)

**Table**: `patients` (schema depends on implementation)

**Key Fields**:
- `id` (UUID, PK)
- `user_id` (FK → `core.users.id`, unique, nullable)
- `medical_record_number` (String, unique)
- `first_name`, `last_name`, `date_of_birth`
- `gender` (Enum: MALE, FEMALE, OTHER)
- `national_id` (String, unique, 14 digits - PINFL)
- `phone`, `email`
- `created_at`, `updated_at`

**Relationships**:
```python
# One-to-One
Patient → User (via user_id) - Each patient linked to one user account

# One-to-Many (implied, not shown in auth flow)
Patient → Appointment
Patient → MedicalRecord
Patient → Prescription
```

**Constraint**: `national_id` (PINFL) must be unique across all patients.

---

### 3.3 UserInvitation Model (`backend/app/common/models/user_invitation.py`)

**Table**: `user_invitations` (schema depends on implementation)

**Key Fields**:
- `id` (UUID, PK)
- `token` (String, unique, indexed)
- `contact` (String) - Email or phone
- `contact_type` (Enum: EMAIL, PHONE)
- `role` (Enum: UserRole)
- `organization_id` (FK → `ref.hospitals.id`)
- `first_name`, `last_name` (optional, pre-filled)
- `status` (Enum: PENDING, ACCEPTED, CANCELLED, EXPIRED)
- `expires_at` (DateTime)
- `created_at`, `updated_at`

**Relationships**:
```python
# One-to-One
UserInvitation → User (implicit, invitation creates user)

# Many-to-One
UserInvitation → Hospital (via organization_id)
```

**Lifecycle**:
1. Admin creates invitation → Status: PENDING
2. User clicks link, validates token → Still PENDING
3. User completes registration → Status: ACCEPTED
4. If expired → Status: EXPIRED
5. Admin can cancel → Status: CANCELLED

---

### 3.4 UserSession Model (`backend/app/common/models/user.py`)

**Table**: `core.user_sessions`

**Purpose**: Track active login sessions

**Key Fields**:
- `id` (UUID, PK)
- `user_id` (FK → `core.users.id`)
- `token_hash` (String, indexed)
- `refresh_token_hash` (String, indexed)
- `ip_address`, `user_agent`, `device_type`, `device_info`
- `location` (String)
- `created_at`, `last_activity`, `expires_at`
- `is_active` (Boolean)
- `revoked_at`, `revoked_reason`

**Relationships**:
```python
# Many-to-One
UserSession → User (via user_id)
```

**Usage**: Track multiple active sessions per user (for security/session management).

---

### 3.5 UserActivity Model (`backend/app/common/models/user.py`)

**Table**: `core.user_activities`

**Purpose**: Audit trail for user actions

**Key Fields**:
- `id` (UUID, PK)
- `user_id` (FK → `core.users.id`)
- `activity_type` (String) - "login", "logout", "create", "update", "delete", "view"
- `description` (Text)
- `resource_id` (UUID, nullable)
- `ip_address`, `user_agent`
- `user_metadata` (JSON)
- `created_at` (DateTime, indexed)

**Relationships**:
```python
# Many-to-One
UserActivity → User (via user_id)
```

**Usage**: Log all authentication events (login, logout, password changes).

---

## 4. AUTHENTICATION FLOW DIAGRAMS

### 4.1 SignIn Flow
```
┌─────────────┐
│   SignIn    │
│  Component  │
└──────┬──────┘
       │
       ├─→ Try Patient Auth API
       │   POST /patient/auth/login
       │   └─→ If PATIENT role → /patient/dashboard
       │
       └─→ Try Unified Auth API
           POST /auth/login
           │
           ├─→ SUPER_ADMIN/CLINIC_ADMIN → /admin/dashboard
           ├─→ DOCTOR → /doctor/dashboard
           ├─→ NURSE → /nurse/dashboard
           ├─→ RECEPTIONIST → /reception/dashboard
           ├─→ LAB_TECHNICIAN → /lab/dashboard
           ├─→ RADIOLOGIST → /radiology/dashboard
           └─→ PATIENT → /patient/dashboard
```

### 4.2 SignUp Flow (Patient Only)
```
┌─────────────┐
│   SignUp    │
│  Component  │
└──────┬──────┘
       │
       ├─→ Form Validation
       │   (Email, PINFL, Phone, Password)
       │
       └─→ POST /patient/auth/register
           │
           ├─→ Create User (role=PATIENT)
           ├─→ Create/Link Patient (by PINFL)
           └─→ Return tokens
               │
               └─→ Navigate to /signin
```

### 4.3 Register Flow (Staff via Invitation)
```
┌─────────────┐
│  Register   │
│  Component  │
└──────┬──────┘
       │
       ├─→ GET /auth/registration/validate-token/{token}
       │   └─→ Check invitation validity
       │
       └─→ POST /auth/registration/
           │
           ├─→ Create User (role from invitation)
           ├─→ Mark Invitation as ACCEPTED
           └─→ Navigate to /signin
```

### 4.4 Forgot Password Flow
```
┌─────────────────┐
│ ForgotPassword  │
│   Component     │
└────────┬────────┘
         │
         ├─→ POST /auth/validate-email (debounced)
         │   └─→ Show email exists/not exists
         │
         └─→ POST /auth/forgot-password
             │
             ├─→ Generate 6-digit code
             ├─→ Store code (15 min expiry)
             ├─→ Send email with code
             └─→ Navigate to /reset-password?email={email}
```

### 4.5 Reset Password Flow
```
┌──────────────┐
│ResetPassword │
│  Component   │
└──────┬───────┘
       │
       ├─→ Step 1: Enter Code
       │   └─→ POST /auth/validate-reset-code
       │       └─→ If valid → Show password form
       │
       └─→ Step 2: Enter New Password
           └─→ POST /auth/reset-password
               │
               ├─→ Verify code
               ├─→ Update User.password_hash
               ├─→ Mark code as used
               └─→ Navigate to /signin
```

---

## 5. SECURITY FEATURES

### 5.1 Password Security
- **Hashing**: Uses `AuthService.get_password_hash()` (bcrypt/argon2)
- **Validation**: Min 8 chars, uppercase, lowercase, number, special char
- **Storage**: Only `password_hash` stored, never plain text

### 5.2 Token Security
- **JWT Tokens**: Signed with secret key
- **Expiration**: Access token (30 min default), Refresh token (longer)
- **Storage**: In-memory reset codes (should be Redis in production)
- **Code Expiry**: 15 minutes for password reset codes

### 5.3 Account Security
- **Status Check**: Only ACTIVE users can login
- **Role Validation**: Patient portal only allows PATIENT role
- **Failed Login Tracking**: `failed_login_attempts`, `locked_until`
- **Session Tracking**: `UserSession` table for active sessions
- **Audit Trail**: `UserActivity` logs all login events

### 5.4 Email Security
- **Validation**: Real-time email existence check (optional, for UX)
- **Reset Codes**: Always return success (don't reveal if email exists)
- **Code Format**: 6-digit numeric codes (easier to type)

---

## 6. RELATIONSHIP SUMMARY

### 6.1 User → Patient (One-to-One)
- **Direction**: User → Patient
- **Foreign Key**: `Patient.user_id` → `User.id`
- **Constraint**: One Patient per User, one User per Patient
- **Used In**: Patient registration, patient login

### 6.2 User → Hospital (Many-to-One)
- **Direction**: User → Hospital
- **Foreign Key**: `User.organization_id` → `Hospital.id`
- **Used In**: All auth flows (optional clinic context)

### 6.3 User → UserInvitation (One-to-One, implicit)
- **Direction**: UserInvitation → User (creates user)
- **Used In**: Staff registration flow

### 6.4 User → UserSession (One-to-Many)
- **Direction**: User → UserSession
- **Foreign Key**: `UserSession.user_id` → `User.id`
- **Used In**: Session management, security

### 6.5 User → UserActivity (One-to-Many)
- **Direction**: User → UserActivity
- **Foreign Key**: `UserActivity.user_id` → `User.id`
- **Used In**: Audit trail, login logging

---

## 7. DATA VALIDATION RULES

### 7.1 Email
- Format: Standard email regex
- Uniqueness: Must be unique in `core.users`
- Case-insensitive matching

### 7.2 PINFL (National ID)
- Format: Exactly 14 digits
- Uniqueness: Must be unique in `patients` table
- Used for: Patient identification, linking

### 7.3 Phone Number
- Format: `+998XXXXXXXXX` (13 characters total)
- Validation: Must start with +998, followed by 9 digits

### 7.4 Password
- Minimum: 8 characters
- Requirements:
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (@$!%*#?&)

### 7.5 Reset Code
- Format: 6-digit numeric code
- Expiry: 15 minutes
- Single-use: Marked as used after successful reset

---

## 8. API ENDPOINT SUMMARY

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/auth/login` | POST | Unified login (all roles) | No |
| `/patient/auth/login` | POST | Patient-specific login | No |
| `/patient/auth/register` | POST | Patient self-registration | No |
| `/auth/registration/validate-token/{token}` | GET | Validate invitation token | No |
| `/auth/registration/` | POST | Complete staff registration | No |
| `/auth/forgot-password` | POST | Request reset code | No |
| `/auth/validate-email` | POST | Check if email exists | No |
| `/auth/validate-reset-code` | POST | Validate reset code | No |
| `/auth/reset-password` | POST | Reset password with code | No |
| `/auth/change-password` | POST | Change password (authenticated) | Yes |

---

## 9. ISSUES & RECOMMENDATIONS

### 9.1 Current Issues
1. **Password Reset Codes**: Stored in-memory (should use Redis/DB)
2. **Session Management**: Not fully implemented (tokens in localStorage)
3. **Email Verification**: `email_verified` field exists but not enforced
4. **Phone Verification**: `phone_verified` field exists but not enforced

### 9.2 Recommendations
1. **Move reset codes to Redis** or database table
2. **Implement refresh token rotation**
3. **Add email verification flow** (send verification link)
4. **Add phone verification flow** (SMS OTP)
5. **Implement rate limiting** on auth endpoints
6. **Add CAPTCHA** on registration/forgot password
7. **Implement 2FA** (two_factor_enabled field exists)

---

## 10. CONCLUSION

The authentication system is well-structured with:
- ✅ Clear separation between patient and staff registration
- ✅ Proper password hashing and validation
- ✅ Role-based access control
- ✅ Audit trail (UserActivity)
- ✅ Session tracking capability
- ⚠️ Password reset codes should be in persistent storage
- ⚠️ Email/phone verification not enforced

The relationships are properly wired:
- User ↔ Patient (one-to-one)
- User → Hospital (many-to-one)
- User → UserSession (one-to-many)
- User → UserActivity (one-to-many)
- UserInvitation → User (creates user)

All auth pages are connected to the correct backend endpoints and database models.



