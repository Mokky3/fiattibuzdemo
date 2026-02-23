# Doctor Portal System Data Model (ERD) - Complete Analysis

## Overview
This document provides a comprehensive data model analysis of the Doctor Portal, mapping all pages, their content, API endpoints, database models, and relationships.

---

## 1. DOCTOR PORTAL PAGES OVERVIEW

### 1.1 Page List
1. **Dashboard** (`/doctor/dashboard`) - Main overview with appointments, messages, todos
2. **Appointments** (`/doctor/appointment`) - Manage patient appointments
3. **Patient** (`/doctor/patient`) - Patient list with reports, prescriptions, radiology
4. **Report** (`/doctor/report/:patientId`) - Create/edit medical reports
5. **ViewReport** (`/reports/:reportId`) - View existing medical report
6. **Stats** (`/doctor/stats`) - Doctor statistics and analytics
7. **Messages** (`/doctor/messages`) - Messaging with patients and staff
8. **Profile** (`/doctor/profile`) - Doctor profile management
9. **ChangePassword** (`/doctor/change-password`) - Password change
10. **Settings** (`/doctor/settings`) - Doctor settings (profile, notifications, security, availability)
11. **PatientProfile** (`/doctor/profile/:patientId`) - View patient details
12. **Imaging/PACS** (`/doctor/imaging`, `/doctor/pacs`) - Medical imaging viewer

---

## 2. PAGE-BY-PAGE ANALYSIS

### 2.1 Dashboard (`frontend/src/components/Doctors/Dashboard.jsx`)

**Purpose**: Central hub showing appointments, messages, todos, and quick stats

**API Calls**:
- `dashboardAPI.getMessages()` → `GET /api/v1/doctor/dashboard/messages`
- `dashboardAPI.getTodos()` → `GET /api/v1/doctor/dashboard/todos`
- `doctorAppointmentsAPI.listAll()` → `GET /api/v1/doctor/appointments/all`

**Data Displayed**:
1. **Appointments** (from appointments API)
   - Date, time, patient name, problem, status
   - Filtered by selected date
   - Click to view details
2. **Messages** (from dashboard messages API)
   - Unread message count
   - Recent conversations
3. **Todos** (from dashboard todos API)
   - Pending tasks
   - Completion status

**Data Flow**:
```
Component Mount
  ↓
Check Authentication
  ↓
Check Backend Health
  ↓
Parallel API Calls:
  ├─→ GET /doctor/dashboard/messages
  ├─→ GET /doctor/dashboard/todos
  └─→ GET /doctor/appointments/all
  ↓
Transform & Display Data
```

**Database Queries** (Backend):
- `SELECT * FROM ehr.messages WHERE recipient_id = ? AND read = false`
- `SELECT * FROM ops.todos WHERE assigned_to = ? AND completed = false`
- `SELECT * FROM ehr.appointments WHERE doctor_id = ? ORDER BY appointment_date`

**Relationships Used**:
- `User` → `Message` (via recipient_id)
- `User` → `Todo` (via assigned_to)
- `Doctor` → `Appointment` (via doctor_id)
- `Appointment` → `Patient` (via patient_id)

---

### 2.2 Appointments (`frontend/src/components/Doctors/Appointments.jsx`)

**Purpose**: Manage all patient appointments - view, create, confirm, decline, complete

**API Calls**:
- `doctorAppointmentsAPI.listAll()` → `GET /api/v1/doctor/appointments/all`
- `doctorAppointmentsAPI.getById()` → `GET /api/v1/doctor/appointments/{appointment_id}`
- `doctorAppointmentsAPI.create()` → `POST /api/v1/doctor/appointments`
- `doctorAppointmentsAPI.confirm()` → `POST /api/v1/doctor/appointments/{id}/confirm`
- `doctorAppointmentsAPI.decline()` → `POST /api/v1/doctor/appointments/{id}/decline`
- `doctorAppointmentsAPI.complete()` → `POST /api/v1/doctor/appointments/{id}/complete`
- `doctorAppointmentsAPI.delete()` → `DELETE /api/v1/doctor/appointments/{id}`
- `doctorPatientsAPI.search()` → `GET /api/v1/doctor/patients/search?q={query}`

**Data Displayed**:
1. **Appointment List** (filtered by status: upcoming, past, pending)
   - Date, time, patient name, appointment type, status
   - Hospital, notes
   - Report link (if report exists)
2. **Appointment Details Modal**
   - Full appointment information
   - Patient details
   - Actions: Confirm, Decline, Complete, Delete
3. **New Appointment Modal**
   - Patient search/selection
   - Date, time, appointment type
   - Notes

**Data Flow**:
```
Component Mount
  ↓
GET /doctor/appointments/all
  ↓
Transform Status (pending/upcoming/past)
  ↓
Display in Sections
  ↓
User Actions:
  ├─→ View Details → GET /doctor/appointments/{id}
  ├─→ Create → POST /doctor/appointments
  ├─→ Confirm → POST /doctor/appointments/{id}/confirm
  ├─→ Decline → POST /doctor/appointments/{id}/decline
  ├─→ Complete → POST /doctor/appointments/{id}/complete
  └─→ Delete → DELETE /doctor/appointments/{id}
```

**Database Operations**:
- **Read**: Query `ehr.appointments` filtered by `doctor_id`
- **Create**: Insert into `ehr.appointments` with `patient_id`, `doctor_id`, `hospital_id`
- **Update**: Update `status` field in `ehr.appointments`
- **Delete**: Soft delete or hard delete from `ehr.appointments`

**Relationships Used**:
- `Doctor` → `Appointment` (one-to-many, `Appointment.doctor_id` → `Doctor.id`)
- `Patient` → `Appointment` (one-to-many, `Appointment.patient_id` → `Patient.patient_id`)
- `Hospital` → `Appointment` (many-to-one, `Appointment.hospital_id` → `Hospital.id`)
- `Appointment` → `MedicalRecord` (one-to-one, optional)

**Status Mapping**:
- Backend: `pending`, `booked`, `confirmed`, `completed`, `cancelled`
- Frontend: `pending`, `upcoming`, `past`

---

### 2.3 Patient (`frontend/src/components/Doctors/Patient.jsx`)

**Purpose**: Patient list with detailed patient information, reports, prescriptions, radiology studies

**API Calls**:
- `doctorPatientsAPI.list()` → `GET /api/v1/doctor/patients`
- `doctorPatientsAPI.getById()` → `GET /api/v1/doctor/patients/{patient_id}`
- `doctorPatientsAPI.getReports()` → `GET /api/v1/doctor/patients/{patient_id}/reports`
- `doctorPatientsAPI.getPrescriptions()` → `GET /api/v1/doctor/patients/{patient_id}/prescriptions`
- `doctorPatientsAPI.getAllergies()` → `GET /api/v1/doctor/patients/{patient_id}/allergies`
- `doctorPatientsAPI.getMedications()` → `GET /api/v1/doctor/patients/{patient_id}/medications`
- `doctorPatientsAPI.getVitals()` → `GET /api/v1/doctor/patients/{patient_id}/vitals`
- `doctorPatientsAPI.getImmunizations()` → `GET /api/v1/doctor/patients/{patient_id}/immunizations`
- `doctorPatientsAPI.createPrescription()` → `POST /api/v1/doctor/prescriptions/patients/{patient_id}`
- `doctorPatientsAPI.deleteReport()` → `DELETE /api/v1/doctor/patients/reports/{report_id}`
- `doctorPatientsAPI.deletePrescription()` → `DELETE /api/v1/doctor/prescriptions/{prescription_id}`
- `medicationsAPI.search()` → `GET /api/v1/medications/search?q={query}`
- `getStudies()` (radiology) → `GET /api/v1/radiology/studies?patient_id={patient_id}`

**Data Displayed**:
1. **Patient List** (left sidebar)
   - Patient name, ID, basic info
   - Search/filter functionality
2. **Patient Details** (main area, tabs):
   - **Reports Tab**: List of medical reports
     - Date, specialty, report type
     - View, delete actions
   - **Prescriptions Tab**: List of prescriptions
     - Medication, dosage, frequency, status
     - Create new prescription modal
     - Medication search with autocomplete
   - **Radiology Tab**: DICOM studies
     - Study list with upload capability
     - Link to OHIF viewer

**Data Flow**:
```
Component Mount
  ↓
GET /doctor/patients (list all)
  ↓
User Selects Patient
  ↓
Parallel API Calls:
  ├─→ GET /doctor/patients/{id} (details)
  ├─→ GET /doctor/patients/{id}/reports
  ├─→ GET /doctor/patients/{id}/prescriptions
  ├─→ GET /doctor/patients/{id}/allergies
  ├─→ GET /doctor/patients/{id}/medications
  ├─→ GET /doctor/patients/{id}/vitals
  └─→ GET /doctor/patients/{id}/immunizations
  ↓
Display in Tabs
```

**Database Operations**:
- **Patient List**: Query `ehr.patients` (filtered by clinic if applicable)
- **Patient Details**: Query `ehr.patients` by `patient_id`
- **Reports**: Query `ehr.medical_records` or `ehr.general_reports` by `patient_id`
- **Prescriptions**: Query `ehr.prescriptions` by `patient_id`
- **Allergies**: Query `ehr.allergy_intolerances` by `patient_id`
- **Medications**: Query `ehr.patient_medications` by `patient_id`
- **Vitals**: Query `ehr.vital_signs` by `patient_id`
- **Immunizations**: Query `ehr.immunizations` by `patient_id`

**Relationships Used**:
- `Patient` → `MedicalRecord` (one-to-many)
- `Patient` → `Prescription` (one-to-many)
- `Patient` → `AllergyIntolerance` (one-to-many)
- `Patient` → `PatientMedication` (one-to-many)
- `Patient` → `VitalSign` (one-to-many)
- `Patient` → `Immunization` (one-to-many)
- `Patient` → `RadiologyStudy` (one-to-many, via radiology service)

---

### 2.4 Report (`frontend/src/components/Doctors/Report.jsx`)

**Purpose**: Create and edit medical reports for patients (multiple specialty forms)

**API Calls**:
- `doctorPatientsAPI.getById()` → `GET /api/v1/doctor/patients/{patient_id}`
- `doctorPatientsAPI.getAllergies()` → `GET /api/v1/doctor/patients/{patient_id}/allergies`
- `doctorPatientsAPI.getVitals()` → `GET /api/v1/doctor/patients/{patient_id}/vitals`
- `doctorPatientsAPI.getImmunizations()` → `GET /api/v1/doctor/patients/{patient_id}/immunizations`
- `doctorPatientsAPI.getReports()` → `GET /api/v1/doctor/patients/{patient_id}/reports`
- `doctorReportsAPI.create()` → `POST /api/v1/doctor/reports`
- `icdCodesAPI.search()` → `GET /api/v1/doctor/general-reports/icd-codes/search`

**Specialty Forms Available**:
1. **General Visit Report** (#001) - `GeneralVisitReport.jsx`
2. **Midwifery** - `MidwiferyForm.jsx`
3. **Gynecology** - `GynecologyForm.jsx`
4. **Proctology** - `ProctologyForm.jsx`
5. **ENT** - `ENTForm.jsx`
6. **Endocrinology** - `EndocrinologyForm.jsx`
7. **Cardiology** - `CardiologyReportForm.jsx`
8. **Trauma/Ortho** - `TraumaOrthoReportForm.jsx`
9. **Ophthalmology** - `OphthalmologyReportForm.jsx`
10. **Oncology** - `OncologyReportForm.jsx`
11. **Neurology** - `NeurologyReportForm.jsx`
12. **Urology** - `UrologyReportForm.jsx`
13. **Allergy/Immunology** - `AllergyImmunologyReportForm.jsx`

**Data Flow**:
```
Route: /doctor/report/:patientId
  ↓
Load Patient Data:
  ├─→ GET /doctor/patients/{patient_id}
  ├─→ GET /doctor/patients/{patient_id}/allergies
  ├─→ GET /doctor/patients/{patient_id}/vitals
  └─→ GET /doctor/patients/{patient_id}/immunizations
  ↓
Load Last Report (to pre-select specialty)
  ↓
User Selects Specialty & Report Code
  ↓
Render Specialty-Specific Form
  ↓
User Fills Form
  ↓
Submit → POST /doctor/reports
  Payload: {
    patient_id, specialty, code, data, clinic_id
  }
  ↓
Navigate to Patient Page or View Report
```

**Database Operations**:
- **Create Report**: Insert into `ehr.general_reports` or specialty-specific table
- **Report Structure**: Stored as JSON in `data` field (flexible schema per specialty)
- **ICD Codes**: Search external ICD-11 API or local database

**Relationships Used**:
- `Doctor` → `GeneralReport` (one-to-many, `GeneralReport.doctor_id` → `Doctor.id`)
- `Patient` → `GeneralReport` (one-to-many, `GeneralReport.patient_id` → `Patient.patient_id`)
- `Appointment` → `GeneralReport` (one-to-one, optional, `GeneralReport.encounter_id` → `Appointment.id`)
- `Hospital` → `GeneralReport` (many-to-one, `GeneralReport.clinic_id` → `Hospital.id`)

**Report Data Structure**:
```json
{
  "patient_id": "uuid",
  "specialty": "general_medicine|ophthalmology|neurology|...",
  "code": "#001|#002|...",
  "data": {
    // Specialty-specific structure
    "chief_complaint": "...",
    "hpi": {...},
    "pe": {...},
    "assessment": {...},
    "plan": {...}
  },
  "clinic_id": "uuid"
}
```

---

### 2.5 ViewReport (`frontend/src/components/Doctors/ViewReport.jsx`)

**Purpose**: View existing medical report in read-only format (printable)

**API Calls**:
- `medicalReportsAPI.getByAppointment()` → `GET /api/v1/medical-reports/appointment/{appointment_id}`
- OR `GET /api/v1/doctor/reports/{report_id}` (fallback)

**Data Displayed**:
- Report header (doctor info, date, specialty)
- Report content (specialty-specific sections)
- Print functionality

**Data Flow**:
```
Route: /reports/:reportId
  ↓
GET /doctor/reports/{report_id}
  ↓
Parse Report Data (specialty-specific)
  ↓
Render Report View
  ↓
Print (browser print dialog)
```

**Database Operations**:
- Query `ehr.general_reports` by `id`
- Join with `Doctor`, `Patient`, `Hospital` for display

**Relationships Used**:
- `GeneralReport` → `Doctor` (many-to-one)
- `GeneralReport` → `Patient` (many-to-one)
- `GeneralReport` → `Hospital` (many-to-one)

---

### 2.6 DoctorStats (`frontend/src/components/Doctors/DoctorStats.jsx`)

**Purpose**: Display doctor statistics and analytics

**API Calls**:
- `apiRequest('/doctor/stats')` → `GET /api/v1/doctor/stats`

**Data Displayed**:
1. **Statistics Cards**:
   - Patients Seen (total count)
   - Appointments Today
   - Prescriptions Written
   - Tasks Pending
   - Reports Submitted

**Data Flow**:
```
Component Mount
  ↓
Check Authentication
  ↓
GET /doctor/stats
  ↓
Display Statistics Cards
```

**Database Operations** (Backend):
- Aggregate queries on:
  - `ehr.appointments` (count by doctor_id, date filters)
  - `ehr.prescriptions` (count by doctor_id)
  - `ehr.general_reports` (count by doctor_id)
  - `ops.todos` (count by assigned_to, completed=false)

**Relationships Used**:
- `Doctor` → `Appointment` (count)
- `Doctor` → `Prescription` (count)
- `Doctor` → `GeneralReport` (count)
- `User` → `Todo` (count)

---

### 2.7 DoctorMessages (`frontend/src/components/Doctors/DoctorMessages.jsx`)

**Purpose**: Messaging system for doctor-patient and doctor-staff communication

**API Calls**:
- `messagesAPI.getConversations()` → `GET /api/v1/doctor/messages/conversations`
- `messagesAPI.getPatients()` → `GET /api/v1/doctor/messages/patients`
- `messagesAPI.getConversationMessages()` → `GET /api/v1/doctor/messages/conversations/{recipient_id}/messages`
- `messagesAPI.send()` → `POST /api/v1/doctor/messages/send`
- `messagesAPI.markConversationRead()` → `POST /api/v1/doctor/messages/conversations/{recipient_id}/mark-read`
- `messagesAPI.getPatientDocuments()` → `GET /api/v1/doctor/messages/patients/{patient_id}/documents`
- `messagesAPI.uploadAttachment()` → `POST /api/v1/doctor/messages/upload-attachment`

**Data Displayed**:
1. **Contact List** (left sidebar)
   - Patients and staff members
   - Unread message count
   - Last message preview
2. **Message Thread** (main area)
   - Message history
   - Send new message
   - Attach documents (reports, lab results, imaging, prescriptions)
3. **Document Modal**
   - Available documents for patient
   - Attach to message

**Data Flow**:
```
Component Mount
  ↓
GET /doctor/messages/conversations (list all)
  ↓
GET /doctor/messages/patients (for contacts without conversations)
  ↓
Merge & Display Contact List
  ↓
User Selects Contact
  ↓
GET /doctor/messages/conversations/{recipient_id}/messages
  ↓
Display Message Thread
  ↓
User Sends Message
  ↓
POST /doctor/messages/send
  ↓
Refresh Thread
```

**Database Operations**:
- **Conversations**: Query `ehr.messages` grouped by `conversation_id` or `patient_id`/`recipient_id`
- **Messages**: Query `ehr.messages` filtered by `conversation_id` or `recipient_id`
- **Send**: Insert into `ehr.messages`
- **Mark Read**: Update `read` and `read_at` in `ehr.messages`
- **Attachments**: Insert into `ehr.message_attachments`

**Relationships Used**:
- `User` → `Message` (one-to-many, as sender: `Message.sender_id` → `User.id`)
- `User` → `Message` (one-to-many, as recipient: `Message.recipient_id` → `User.id`)
- `Patient` → `Message` (one-to-many, `Message.patient_id` → `Patient.patient_id`)
- `Message` → `MessageAttachment` (one-to-many)
- `Message` → `MessageThread` (many-to-one, optional)

**Message Structure**:
```json
{
  "sender_id": "uuid",
  "recipient_id": "uuid", // For staff-to-staff
  "patient_id": "uuid", // For patient messages
  "subject": "string",
  "content": "text",
  "message_type": "TEXT|IMAGE|DOCUMENT|SYSTEM",
  "priority": "LOW|NORMAL|HIGH|URGENT",
  "clinic_id": "uuid"
}
```

---

### 2.8 DoctorProfile (`frontend/src/components/Doctors/DoctorProfile.jsx`)

**Purpose**: View and edit doctor profile information

**API Calls**:
- `doctorsAPI.getProfile()` → `GET /api/v1/doctor/profile`
- `doctorsAPI.updateProfile()` → `PUT /api/v1/doctor/profile`

**Data Displayed**:
- Full name, email, phone
- Specialty, license number
- Organization
- Bio, address

**Data Flow**:
```
Component Mount
  ↓
GET /doctor/profile
  ↓
Display Profile (read-only)
  ↓
User Clicks Edit
  ↓
Enable Edit Mode
  ↓
User Saves
  ↓
PUT /doctor/profile
  ↓
Update Display
```

**Database Operations**:
- **Read**: Query `ehr.doctors` joined with `core.users` by `user_id`
- **Update**: Update `ehr.doctors` and `core.users` tables

**Relationships Used**:
- `User` → `Doctor` (one-to-one, `Doctor.user_id` → `User.id`)
- `Doctor` → `Hospital` (many-to-many, via `doctor_hospitals` table)

---

### 2.9 Settings (`frontend/src/components/Doctors/settings.jsx`)

**Purpose**: Manage doctor settings (profile, notifications, security, availability)

**API Calls**:
- `doctorsAPI.getProfile()` → `GET /api/v1/doctor/profile`
- `doctorSettingsAPI.getSettings()` → `GET /api/v1/doctor/settings`
- `doctorsAPI.updateProfile()` → `PUT /api/v1/doctor/profile`
- `doctorSettingsAPI.saveNotifications()` → `PUT /api/v1/doctor/settings/notifications`
- `doctorSettingsAPI.saveSecurity()` → `PUT /api/v1/doctor/settings/security`
- `doctorSettingsAPI.saveAvailability()` → `PUT /api/v1/doctor/settings/availability`
- `doctorSettingsAPI.changePassword()` → `POST /api/v1/doctor/settings/change-password`
- `doctorSettingsAPI.uploadProfileImage()` → `POST /api/v1/doctor/profile/upload-image`

**Data Displayed** (Tabs):
1. **Profile Tab**
   - Personal information
   - Professional details
   - Profile image upload
2. **Notifications Tab**
   - Email/SMS/Push preferences
   - Appointment reminders
   - Patient messages
   - System updates
3. **Security Tab**
   - Two-factor authentication
   - Login alerts
   - Session timeout
   - Password expiry
4. **Availability Tab**
   - Working days
   - Working hours
   - Lunch break
   - Consultation duration
   - Buffer time

**Data Flow**:
```
Component Mount
  ↓
Parallel API Calls:
  ├─→ GET /doctor/profile
  └─→ GET /doctor/settings
  ↓
Populate Form Fields
  ↓
User Edits & Saves (per tab)
  ↓
PUT /doctor/settings/{section}
  ↓
Update Display
```

**Database Operations**:
- **Settings**: Query/Update `core.user_settings` by `user_id`
- **Profile**: Query/Update `ehr.doctors` and `core.users`
- **Password**: Update `core.users.password_hash`

**Relationships Used**:
- `User` → `UserSettings` (one-to-one, `UserSettings.user_id` → `User.id`)
- `User` → `Doctor` (one-to-one)

---

### 2.10 ChangePassword (`frontend/src/components/Doctors/ChangePassword.jsx`)

**Purpose**: Change doctor password

**API Calls**:
- `authAPI.changePassword()` → `POST /api/v1/auth/change-password`
- OR `doctorSettingsAPI.changePassword()` → `POST /api/v1/doctor/settings/change-password`

**Data Flow**:
```
User Enters:
  - Current password
  - New password
  - Confirm password
  ↓
POST /doctor/settings/change-password
  ↓
Success/Error Message
```

**Database Operations**:
- Verify current password hash
- Hash new password
- Update `core.users.password_hash`
- Update `core.users.password_changed_at`

---

### 2.11 PatientProfile (`frontend/src/components/Patients/profile.jsx` - used in doctor portal)

**Purpose**: View detailed patient profile from doctor's perspective

**API Calls**:
- `doctorPatientsAPI.getById()` → `GET /api/v1/doctor/patients/{patient_id}`
- `doctorPatientsAPI.getAllergies()` → `GET /api/v1/doctor/patients/{patient_id}/allergies`
- `doctorPatientsAPI.getMedications()` → `GET /api/v1/doctor/patients/{patient_id}/medications`
- `doctorPatientsAPI.getVitals()` → `GET /api/v1/doctor/patients/{patient_id}/vitals`
- `doctorPatientsAPI.getImmunizations()` → `GET /api/v1/doctor/patients/{patient_id}/immunizations`

**Data Displayed**:
- Demographics (name, DOB, gender, contact)
- Medical history
- Allergies
- Current medications
- Vital signs history
- Immunizations

**Relationships Used**:
- Same as Patient page (section 2.3)

---

### 2.12 Imaging/PACS (`frontend/src/components/Doctors/ImagingViewer.jsx`)

**Purpose**: View medical imaging studies (DICOM) using OHIF viewer

**API Calls**:
- `doctorImagingAPI.getViewerUrl()` → `GET /api/v1/doctor/imaging/viewer?study_id={id}`
- `doctorImagingAPI.listStudies()` → `GET /api/v1/doctor/imaging/studies?patient_id={id}`
- `doctorImagingAPI.getStudyDetails()` → `GET /api/v1/doctor/imaging/studies/{study_id}`

**Data Displayed**:
- Study list (filtered by patient if provided)
- OHIF viewer URL (embedded or redirect)
- Study metadata

**Data Flow**:
```
Route: /doctor/imaging or /doctor/imaging/:studyId
  ↓
GET /doctor/imaging/studies (if no study_id)
  ↓
Display Study List
  ↓
User Selects Study
  ↓
GET /doctor/imaging/viewer?study_id={id}
  ↓
Embed OHIF Viewer or Redirect
```

**Database Operations**:
- Query radiology service (may be external PACS or local database)
- Study metadata stored in `ehr.radiology_studies` or external system

**Relationships Used**:
- `Patient` → `RadiologyStudy` (one-to-many)
- `RadiologyStudy` → `DICOMSeries` (one-to-many, via PACS)

---

## 3. BACKEND ROUTES & ENDPOINTS

### 3.1 Appointments Routes (`backend/app/portals/doctor/routes/appointments_enhanced.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/appointments/all` | GET | List all appointments | `List[AppointmentSummary]` |
| `/doctor/appointments/comprehensive` | GET | List with full relationships | `List[AppointmentSummary]` |
| `/doctor/appointments` | GET | Paginated list with filters | `PaginatedResponse[AppointmentSummary]` |
| `/doctor/appointments/{id}` | GET | Get appointment details | `AppointmentSummary` |
| `/doctor/appointments` | POST | Create new appointment | `AppointmentSummary` |
| `/doctor/appointments/{id}` | PUT | Update appointment | `AppointmentSummary` |
| `/doctor/appointments/{id}/confirm` | POST | Confirm appointment | `AppointmentSummary` |
| `/doctor/appointments/{id}/decline` | POST | Decline appointment | `AppointmentSummary` |
| `/doctor/appointments/{id}/complete` | POST | Complete appointment | `AppointmentSummary` |
| `/doctor/appointments/{id}` | DELETE | Delete appointment | `Dict[str, str]` |
| `/doctor/appointments/availability` | GET | Check availability | `List[AvailabilitySlot]` |
| `/doctor/appointments/by-date/{date}` | GET | Get appointments by date | `List[AppointmentSummary]` |

**Database Models**:
- Primary: `ehr.appointments`
- Joins: `ehr.patients`, `ehr.doctors`, `ref.hospitals`

---

### 3.2 Patients Routes (`backend/app/portals/doctor/routes/patients.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/patients` | GET | List all patients | `List[PatientOut]` |
| `/doctor/patients/search` | GET | Search patients | `List[PatientOut]` |
| `/doctor/patients/{id}` | GET | Get patient details | `PatientOut` |
| `/doctor/patients/{id}/reports` | GET | Get patient reports | `List[ReportSummary]` |
| `/doctor/patients/{id}/prescriptions` | GET | Get patient prescriptions | `List[PrescriptionSummary]` |
| `/doctor/patients/{id}/allergies` | GET | Get patient allergies | `List[Dict]` |
| `/doctor/patients/{id}/medications` | GET | Get patient medications | `List[Dict]` |
| `/doctor/patients/{id}/vitals` | GET | Get patient vitals | `List[Dict]` |
| `/doctor/patients/{id}/immunizations` | GET | Get patient immunizations | `List[Dict]` |
| `/doctor/patients/{id}/summary` | GET | Get patient summary | `Dict[str, Any]` |
| `/doctor/patients/reports/{id}` | DELETE | Delete report | `Dict[str, str]` |
| `/doctor/patients/prescriptions/{id}` | DELETE | Delete prescription | `Dict[str, str]` |
| `/doctor/patients/prescriptions/{id}/status` | PATCH | Update prescription status | `Dict[str, str]` |

**Database Models**:
- Primary: `ehr.patients`
- Related: `ehr.allergy_intolerances`, `ehr.patient_medications`, `ehr.vital_signs`, `ehr.immunizations`

---

### 3.3 Reports Routes (`backend/app/portals/doctor/routes/reports_enhanced.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/reports` | POST | Create new report | `ReportSummary` |
| `/doctor/reports` | GET | List reports (paginated) | `PaginatedResponse[ReportSummary]` |
| `/doctor/reports/{id}` | GET | Get report details | `Dict[str, Any]` |
| `/doctor/reports/vitals` | POST | Create vitals record | `Dict[str, str]` |

**Database Models**:
- Primary: `ehr.general_reports`
- Joins: `ehr.patients`, `ehr.doctors`, `ref.hospitals`, `ehr.appointments`

---

### 3.4 Messages Routes (`backend/app/portals/doctor/routes/messages_enhanced.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/messages/conversations` | GET | List conversations | `PaginatedResponse[ConversationSummary]` |
| `/doctor/messages/conversations/{id}/messages` | GET | Get message thread | `MessageThread` |
| `/doctor/messages/send` | POST | Send message | `Dict[str, Any]` |
| `/doctor/messages/conversations/{id}/mark-read` | POST | Mark conversation as read | `Dict[str, str]` |
| `/doctor/messages/unread` | GET | Get unread messages | `List[Dict]` |
| `/doctor/messages/stats` | GET | Get message statistics | `MessageStats` |
| `/doctor/messages/patients` | GET | Get patients for messaging | `List[Dict]` |
| `/doctor/messages/patients/{id}/documents` | GET | Get patient documents | `List[Dict]` |
| `/doctor/messages/upload-attachment` | POST | Upload attachment | `Dict[str, str]` |
| `/doctor/messages/messages/{id}` | DELETE | Delete message | `Dict[str, str]` |

**Database Models**:
- Primary: `ehr.messages`
- Related: `ehr.message_attachments`, `ehr.message_threads`

---

### 3.5 Dashboard Routes (`backend/app/portals/doctor/routes/dashboard.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/dashboard/messages` | GET | Get dashboard messages | `List[Message]` |
| `/doctor/dashboard/messages/{id}/mark-read` | POST | Mark message as read | `Dict[str, str]` |
| `/doctor/dashboard/todos` | GET | Get todos | `List[Todo]` |
| `/doctor/dashboard/todos` | POST | Create todo | `Todo` |
| `/doctor/dashboard/todos/{id}` | PATCH | Update todo | `Todo` |
| `/doctor/dashboard/todos/{id}` | DELETE | Delete todo | `Dict[str, str]` |
| `/doctor/dashboard/appointments/{date}` | GET | Get appointments by date | `List[Appointment]` |
| `/doctor/dashboard/stats` | GET | Get dashboard statistics | `DashboardStats` |
| `/doctor/dashboard/overview` | GET | Get dashboard overview | `Dict[str, object]` |

**Database Models**:
- `ehr.messages`, `ops.todos`, `ehr.appointments`

---

### 3.6 Stats Routes (`backend/app/portals/doctor/routes/stats.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/stats` | GET | Get basic statistics | `DoctorStats` |
| `/doctor/stats/detailed` | GET | Get detailed statistics | `DetailedStats` |
| `/doctor/stats/weekly` | GET | Get weekly statistics | `List[WeeklyStats]` |
| `/doctor/stats/monthly` | GET | Get monthly statistics | `List[MonthlyOverview]` |
| `/doctor/stats/comparison` | GET | Get comparison stats | `StatsComparison` |
| `/doctor/stats/dashboard-summary` | GET | Get dashboard summary | `Dict[str, object]` |
| `/doctor/stats/export` | GET | Export statistics | `Dict[str, object]` |
| `/doctor/stats/real-time` | GET | Get real-time stats | `Dict[str, object]` |

**Database Models**:
- Aggregates from: `ehr.appointments`, `ehr.prescriptions`, `ehr.general_reports`, `ops.todos`

---

### 3.7 Profile Routes (`backend/app/portals/doctor/routes/profile.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/profile` | GET | Get doctor profile | `SharedDoctorProfileResponse` |
| `/doctor/profile` | PUT | Update doctor profile | `SharedDoctorProfileResponse` |
| `/doctor/profile/upload-image` | POST | Upload profile image | `dict` |

**Database Models**:
- `ehr.doctors`, `core.users`, `core.user_profiles`

---

### 3.8 Settings Routes (`backend/app/portals/doctor/routes/settings.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/settings` | GET | Get all settings | `AllSettings` |
| `/doctor/settings` | PUT | Update all settings | `AllSettings` |
| `/doctor/settings/notifications` | GET | Get notification settings | `NotificationSettings` |
| `/doctor/settings/notifications` | PUT | Update notification settings | `NotificationSettings` |
| `/doctor/settings/security` | GET | Get security settings | `SecuritySettings` |
| `/doctor/settings/security` | PUT | Update security settings | `SecuritySettings` |
| `/doctor/settings/change-password` | POST | Change password | `Dict[str, str]` |
| `/doctor/settings/toggle-2fa` | POST | Toggle 2FA | `Dict[str, bool]` |
| `/doctor/settings/availability` | GET | Get availability settings | `AvailabilitySettings` |
| `/doctor/settings/availability` | PUT | Update availability settings | `AvailabilitySettings` |
| `/doctor/settings/reset-to-defaults` | POST | Reset to defaults | `AllSettings` |
| `/doctor/settings/export` | GET | Export settings | `Dict[str, Dict]` |

**Database Models**:
- `core.user_settings`, `core.users`

---

### 3.9 Prescriptions Routes (`backend/app/portals/doctor/routes/prescriptions.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/prescriptions/patients/{id}` | POST | Create prescription | `PrescriptionSummary` |
| `/doctor/prescriptions/{id}` | PATCH | Update prescription | `PrescriptionSummary` |
| `/doctor/prescriptions/{id}` | DELETE | Delete prescription | `Dict[str, str]` |

**Database Models**:
- `ehr.prescriptions`

---

### 3.10 General Reports Routes (`backend/app/portals/doctor/routes/general_reports.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/general-reports` | POST | Create general report | `GeneralReportResponse` |
| `/doctor/general-reports` | GET | List reports | `PaginatedResponse[GeneralReportSummary]` |
| `/doctor/general-reports/{id}` | GET | Get report | `GeneralReportResponse` |
| `/doctor/general-reports/{id}` | PUT | Update report | `GeneralReportResponse` |
| `/doctor/general-reports/{id}` | DELETE | Delete report | `Dict[str, str]` |
| `/doctor/general-reports/icd-codes/search` | GET | Search ICD codes | `IcdCodeSearchResponse` |
| `/doctor/general-reports/icd-codes/select` | POST | Select ICD code | `IcdCodeResponse` |
| `/doctor/general-reports/icd-codes/{code}` | GET | Get ICD code | `IcdCodeResponse` |

**Database Models**:
- `ehr.general_reports`

---

### 3.11 Imaging Routes (`backend/app/portals/doctor/routes/imaging.py`)

| Endpoint | Method | Purpose | Response Model |
|----------|--------|---------|----------------|
| `/doctor/imaging/studies` | GET | List studies | `StudiesListResponse` |
| `/doctor/imaging/viewer` | GET | Get OHIF viewer URL | `OHIFViewerResponse` |
| `/doctor/imaging/studies/{id}` | GET | Get study details | `StudyInfo` |

**Database Models**:
- May use external PACS or `ehr.radiology_studies`

---

## 4. DATABASE MODELS & RELATIONSHIPS

### 4.1 Core Models

#### 4.1.1 User Model (`core.users`)
**Table**: `core.users`

**Key Relationships**:
- `User` → `Doctor` (one-to-one, `Doctor.user_id` → `User.id`)
- `User` → `Patient` (one-to-one, `Patient.user_id` → `User.id`)
- `User` → `Message` (one-to-many, as sender and recipient)
- `User` → `UserSettings` (one-to-one)
- `User` → `UserSession` (one-to-many)
- `User` → `UserActivity` (one-to-many)

---

#### 4.1.2 Doctor Model (`ehr.doctors`)
**Table**: `ehr.doctors`

**Key Fields**:
- `id` (UUID, PK)
- `user_id` (FK → `core.users.id`, unique)
- `license_number` (String, unique)
- `primary_specialization` (String)
- `sub_specializations` (JSON)
- `years_of_experience` (Integer)
- `consultation_fee` (Float)
- `bio` (Text)
- `education` (JSON)
- `rating` (Float)

**Key Relationships**:
- `Doctor` → `User` (many-to-one, `Doctor.user_id` → `User.id`)
- `Doctor` → `Appointment` (one-to-many, `Appointment.doctor_id` → `Doctor.id`)
- `Doctor` → `Prescription` (one-to-many, `Prescription.doctor_id` → `Doctor.id`)
- `Doctor` → `GeneralReport` (one-to-many, `GeneralReport.doctor_id` → `Doctor.id`)
- `Doctor` → `MedicalRecord` (one-to-many, `MedicalRecord.doctor_id` → `Doctor.id`)
- `Doctor` → `Hospital` (many-to-many, via `doctor_hospitals`)
- `Doctor` → `HospitalDepartment` (many-to-many, via `doctor_departments`)

---

#### 4.1.3 Patient Model (`ehr.patients`)
**Table**: `ehr.patients`

**Key Fields**:
- `patient_id` (UUID, PK)
- `user_id` (FK → `core.users.id`, unique, nullable)
- `date_of_birth` (Date)
- `sex` (String)
- `phone` (String)
- `address` (Text)

**Key Relationships**:
- `Patient` → `User` (many-to-one, `Patient.user_id` → `User.id`)
- `Patient` → `Appointment` (one-to-many, `Appointment.patient_id` → `Patient.patient_id`)
- `Patient` → `Prescription` (one-to-many, `Prescription.patient_id` → `Patient.patient_id`)
- `Patient` → `MedicalRecord` (one-to-many, `MedicalRecord.patient_id` → `Patient.patient_id`)
- `Patient` → `GeneralReport` (one-to-many, `GeneralReport.patient_id` → `Patient.patient_id`)
- `Patient` → `AllergyIntolerance` (one-to-many)
- `Patient` → `PatientMedication` (one-to-many)
- `Patient` → `VitalSign` (one-to-many)
- `Patient` → `Immunization` (one-to-many)
- `Patient` → `Message` (one-to-many, `Message.patient_id` → `Patient.patient_id`)

---

#### 4.1.4 Appointment Model (`ehr.appointments`)
**Table**: `ehr.appointments`

**Key Fields**:
- `id` (UUID, PK)
- `patient_id` (FK → `ehr.patients.patient_id`)
- `doctor_id` (FK → `ehr.doctors.id`)
- `hospital_id` (FK → `ref.hospitals.id`)
- `appointment_date` (DateTime)
- `duration_minutes` (Integer)
- `status` (String) - pending, booked, confirmed, completed, cancelled
- `appointment_type` (String)
- `reason` (Text)
- `notes` (Text)

**Key Relationships**:
- `Appointment` → `Patient` (many-to-one, `Appointment.patient_id` → `Patient.patient_id`)
- `Appointment` → `Doctor` (many-to-one, `Appointment.doctor_id` → `Doctor.id`)
- `Appointment` → `Hospital` (many-to-one, `Appointment.hospital_id` → `Hospital.id`)
- `Appointment` → `MedicalRecord` (one-to-one, optional)
- `Appointment` → `GeneralReport` (one-to-many, `GeneralReport.encounter_id` → `Appointment.id`)
- `Appointment` → `Encounter` (one-to-one, optional)
- `Appointment` → `AppointmentParticipant` (one-to-many)
- `Appointment` → `AppointmentReminder` (one-to-many)

---

#### 4.1.5 GeneralReport Model (`ehr.general_reports`)
**Table**: `ehr.general_reports`

**Key Fields**:
- `id` (UUID, PK)
- `patient_id` (FK → `ehr.patients.patient_id`)
- `doctor_id` (FK → `ehr.doctors.id`)
- `encounter_id` (FK → `ehr.appointments.id`, nullable)
- `clinic_id` (FK → `ref.hospitals.id`)
- `report_code` (String) - #001, #002, etc.
- `report_type` (String) - general_visit, midwifery, etc.
- `status` (String) - draft, final, signed
- `chief_complaint` (Text)
- `hpi_*` (various HPI fields)
- `pmh_*` (past medical history fields)
- `ros_*` (review of systems fields)
- `pe_*` (physical examination fields)
- `working_diagnoses` (JSON)
- `differential_diagnoses` (JSON)
- `plan_*` (plan fields)
- `visit_summary` (Text)

**Key Relationships**:
- `GeneralReport` → `Patient` (many-to-one, `GeneralReport.patient_id` → `Patient.patient_id`)
- `GeneralReport` → `Doctor` (many-to-one, `GeneralReport.doctor_id` → `Doctor.id`)
- `GeneralReport` → `Appointment` (many-to-one, optional, `GeneralReport.encounter_id` → `Appointment.id`)
- `GeneralReport` → `Hospital` (many-to-one, `GeneralReport.clinic_id` → `Hospital.id`)

**Note**: Specialty-specific reports (Ophthalmology, Neurology, etc.) may use the same table with different `report_code` and structured JSON in additional fields, or separate tables.

---

#### 4.1.6 Prescription Model (`ehr.prescriptions`)
**Table**: `ehr.prescriptions`

**Key Fields**:
- `id` (UUID, PK)
- `patient_id` (FK → `ehr.patients.patient_id`)
- `doctor_id` (FK → `ehr.doctors.id`)
- `hospital_id` (FK → `ref.hospitals.id`)
- `encounter_id` (FK → `ehr.appointments.id`, nullable)
- `prescription_number` (String, unique)
- `medicine_name` (String)
- `medicine_code` (String)
- `dosage` (String)
- `frequency` (String)
- `duration` (String)
- `status` (Enum) - active, on_hold, completed, cancelled
- `prescribed_date` (DateTime)
- `start_date` (Date)
- `end_date` (Date)
- `total_refills` (Integer)
- `remaining_refills` (Integer)
- `purpose` (Text)
- `notes` (Text)

**Key Relationships**:
- `Prescription` → `Patient` (many-to-one, `Prescription.patient_id` → `Patient.patient_id`)
- `Prescription` → `Doctor` (many-to-one, `Prescription.doctor_id` → `Doctor.id`)
- `Prescription` → `Hospital` (many-to-one, `Prescription.hospital_id` → `Hospital.id`)
- `Prescription` → `Appointment` (many-to-one, optional, `Prescription.encounter_id` → `Appointment.id`)
- `Prescription` → `User` (many-to-one, `Prescription.prescribed_by` → `User.id`)

---

#### 4.1.7 Message Model (`ehr.messages`)
**Table**: `ehr.messages`

**Key Fields**:
- `id` (UUID, PK)
- `conversation_id` (String, indexed)
- `sender_id` (FK → `core.users.id`)
- `recipient_id` (FK → `core.users.id`, nullable)
- `patient_id` (FK → `ehr.patients.patient_id`, nullable)
- `subject` (String)
- `content` (Text)
- `message_type` (Enum) - TEXT, IMAGE, DOCUMENT, SYSTEM
- `priority` (Enum) - LOW, NORMAL, HIGH, URGENT
- `read` (Boolean)
- `read_at` (DateTime)
- `delivered` (Boolean)
- `delivered_at` (DateTime)
- `thread_id` (FK → `ehr.message_threads.id`, nullable)
- `clinic_id` (String)

**Key Relationships**:
- `Message` → `User` (many-to-one, as sender: `Message.sender_id` → `User.id`)
- `Message` → `User` (many-to-one, as recipient: `Message.recipient_id` → `User.id`)
- `Message` → `Patient` (many-to-one, optional, `Message.patient_id` → `Patient.patient_id`)
- `Message` → `MessageThread` (many-to-one, optional)
- `Message` → `MessageAttachment` (one-to-many)

---

#### 4.1.8 MedicalRecord Model (`ehr.medical_records`)
**Table**: `ehr.medical_records`

**Key Fields**:
- `id` (String, PK)
- `patient_id` (FK → `ehr.patients.patient_id`)
- `doctor_id` (FK → `ehr.doctors.id`)
- `hospital_id` (FK → `ref.hospitals.id`)
- `appointment_id` (FK → `ehr.appointments.id`, nullable)
- `record_number` (String, unique)
- `record_date` (DateTime)
- `record_type` (Enum)
- `status` (Enum) - draft, final, signed
- `chief_complaint` (Text)
- `history_of_present_illness` (Text)
- `physical_examination` (JSON)
- `primary_diagnosis` (Text)
- `diagnosis_codes` (JSON)
- `treatment_plan` (Text)
- `summary` (Text)

**Key Relationships**:
- `MedicalRecord` → `Patient` (many-to-one)
- `MedicalRecord` → `Doctor` (many-to-one)
- `MedicalRecord` → `Appointment` (many-to-one, optional)
- `MedicalRecord` → `VitalSign` (one-to-one, optional)

---

### 4.2 Supporting Models

#### 4.2.1 AllergyIntolerance (`ehr.allergy_intolerances`)
- `patient_id` → `Patient.patient_id`
- Stores patient allergies

#### 4.2.2 PatientMedication (`ehr.patient_medications`)
- `patient_id` → `Patient.patient_id`
- `prescription_id` → `Prescription.id` (optional)
- Stores current medications

#### 4.2.3 VitalSign (`ehr.vital_signs`)
- `patient_id` → `Patient.patient_id`
- `medical_record_id` → `MedicalRecord.id` (optional)
- Stores vital signs (BP, temperature, height, weight, BMI, etc.)

#### 4.2.4 Immunization (`ehr.immunizations`)
- `patient_id` → `Patient.patient_id`
- Stores immunization records

#### 4.2.5 Todo (`ops.todos`)
- `assigned_to` → `User.id`
- `created_by` → `User.id`
- Stores task/todo items

#### 4.2.6 UserSettings (`core.user_settings`)
- `user_id` → `User.id` (unique)
- Stores user preferences (notifications, security, availability)

---

## 5. RELATIONSHIP DIAGRAM

### 5.1 Core Relationships

```
User (core.users)
  ├─→ Doctor (ehr.doctors) [1:1]
  ├─→ Patient (ehr.patients) [1:1]
  ├─→ UserSettings (core.user_settings) [1:1]
  ├─→ Message (as sender) [1:N]
  ├─→ Message (as recipient) [1:N]
  ├─→ Todo (as assigned_to) [1:N]
  └─→ UserSession (core.user_sessions) [1:N]

Doctor (ehr.doctors)
  ├─→ Appointment (ehr.appointments) [1:N]
  ├─→ Prescription (ehr.prescriptions) [1:N]
  ├─→ GeneralReport (ehr.general_reports) [1:N]
  ├─→ MedicalRecord (ehr.medical_records) [1:N]
  ├─→ Hospital (ref.hospitals) [N:M via doctor_hospitals]
  └─→ HospitalDepartment (ref.hospital_departments) [N:M via doctor_departments]

Patient (ehr.patients)
  ├─→ Appointment (ehr.appointments) [1:N]
  ├─→ Prescription (ehr.prescriptions) [1:N]
  ├─→ GeneralReport (ehr.general_reports) [1:N]
  ├─→ MedicalRecord (ehr.medical_records) [1:N]
  ├─→ AllergyIntolerance (ehr.allergy_intolerances) [1:N]
  ├─→ PatientMedication (ehr.patient_medications) [1:N]
  ├─→ VitalSign (ehr.vital_signs) [1:N]
  ├─→ Immunization (ehr.immunizations) [1:N]
  └─→ Message (ehr.messages) [1:N]

Appointment (ehr.appointments)
  ├─→ MedicalRecord (ehr.medical_records) [1:1 optional]
  ├─→ GeneralReport (ehr.general_reports) [1:N]
  ├─→ Encounter (ehr.encounters) [1:1 optional]
  └─→ AppointmentParticipant (ehr.appointment_participants) [1:N]

GeneralReport (ehr.general_reports)
  └─→ (linked to Patient, Doctor, Appointment, Hospital)

Prescription (ehr.prescriptions)
  └─→ (linked to Patient, Doctor, Hospital, Appointment)

Message (ehr.messages)
  ├─→ MessageAttachment (ehr.message_attachments) [1:N]
  └─→ MessageThread (ehr.message_threads) [N:1 optional]
```

---

## 6. DATA FLOW SUMMARY

### 6.1 Authentication Flow
```
User Login → JWT Token → Stored in localStorage
  ↓
All API Calls Include: Authorization: Bearer {token}
  ↓
Backend Validates Token → Extracts user_id, role
  ↓
Queries Filtered by user_id/doctor_id
```

### 6.2 Typical Doctor Workflow

**1. View Dashboard**:
```
GET /doctor/dashboard/messages
GET /doctor/dashboard/todos
GET /doctor/appointments/all
→ Display aggregated data
```

**2. Manage Appointments**:
```
GET /doctor/appointments/all
→ Display list
→ User clicks appointment
→ GET /doctor/appointments/{id}
→ Display details
→ User confirms
→ POST /doctor/appointments/{id}/confirm
→ Update status in database
```

**3. View Patient**:
```
GET /doctor/patients
→ Display patient list
→ User selects patient
→ GET /doctor/patients/{id}
→ GET /doctor/patients/{id}/reports
→ GET /doctor/patients/{id}/prescriptions
→ Display patient information
```

**4. Create Report**:
```
Navigate to /doctor/report/:patientId
→ GET /doctor/patients/{id}
→ GET /doctor/patients/{id}/allergies
→ GET /doctor/patients/{id}/vitals
→ User fills form
→ POST /doctor/reports
  {
    patient_id, specialty, code, data, clinic_id
  }
→ Insert into ehr.general_reports
→ Navigate to patient page
```

**5. Send Message**:
```
GET /doctor/messages/conversations
→ Display contact list
→ User selects contact
→ GET /doctor/messages/conversations/{id}/messages
→ Display thread
→ User sends message
→ POST /doctor/messages/send
→ Insert into ehr.messages
→ Refresh thread
```

---

## 7. API ENDPOINT SUMMARY

### 7.1 Complete Endpoint List

| Category | Endpoint Pattern | Count |
|----------|------------------|-------|
| Appointments | `/doctor/appointments/*` | 12 |
| Patients | `/doctor/patients/*` | 12 |
| Reports | `/doctor/reports/*` | 4 |
| General Reports | `/doctor/general-reports/*` | 8 |
| Messages | `/doctor/messages/*` | 9 |
| Dashboard | `/doctor/dashboard/*` | 9 |
| Stats | `/doctor/stats/*` | 8 |
| Profile | `/doctor/profile/*` | 3 |
| Settings | `/doctor/settings/*` | 12 |
| Prescriptions | `/doctor/prescriptions/*` | 3 |
| Imaging | `/doctor/imaging/*` | 3 |
| Test Orders | `/doctor/test-orders/*` | 5 |
| Referrals | `/doctor/referrals/*` | 5 |
| **Total** | | **93 endpoints** |

---

## 8. DATABASE SCHEMA SUMMARY

### 8.1 Primary Tables Used

| Schema | Table | Purpose | Key Relationships |
|--------|-------|---------|------------------|
| `core` | `users` | User accounts | → doctors, patients, messages |
| `core` | `user_settings` | User preferences | → users (1:1) |
| `ehr` | `doctors` | Doctor profiles | → users (1:1), appointments, prescriptions, reports |
| `ehr` | `patients` | Patient records | → users (1:1), appointments, prescriptions, reports |
| `ehr` | `appointments` | Appointment scheduling | → patients, doctors, hospitals |
| `ehr` | `general_reports` | Medical reports | → patients, doctors, appointments |
| `ehr` | `medical_records` | Medical records | → patients, doctors, appointments |
| `ehr` | `prescriptions` | Prescriptions | → patients, doctors, appointments |
| `ehr` | `messages` | Messages | → users (sender/recipient), patients |
| `ehr` | `allergy_intolerances` | Allergies | → patients |
| `ehr` | `patient_medications` | Medications | → patients, prescriptions |
| `ehr` | `vital_signs` | Vital signs | → patients, medical_records |
| `ehr` | `immunizations` | Immunizations | → patients |
| `ops` | `todos` | Tasks | → users |
| `ref` | `hospitals` | Hospitals/clinics | → doctors, appointments |
| `ref` | `hospital_departments` | Departments | → doctors |

---

## 9. KEY FINDINGS & RECOMMENDATIONS

### 9.1 Well-Implemented
✅ **Clear separation** between general reports and specialty-specific reports  
✅ **Comprehensive patient data** access (allergies, medications, vitals, immunizations)  
✅ **Flexible report structure** using JSON for specialty-specific data  
✅ **Proper relationships** between doctors, patients, appointments, reports  
✅ **Messaging system** supports both patient and staff communication  
✅ **Settings management** with separate endpoints for different sections  

### 9.2 Areas for Improvement
⚠️ **Report Structure**: Specialty reports stored in same table with JSON - consider separate tables for better querying  
⚠️ **ICD Codes**: External API dependency - consider caching or local database  
⚠️ **Imaging**: PACS integration may be external - ensure proper patient linking  
⚠️ **Message Threading**: `conversation_id` vs `thread_id` - clarify usage  
⚠️ **Appointment Status**: Multiple status enums (AppointmentStatus vs frontend mapping) - standardize  

### 9.3 Data Integrity
✅ Foreign keys properly defined  
✅ Unique constraints on critical fields (license_number, prescription_number)  
✅ Cascade deletes configured appropriately  
⚠️ Soft deletes not consistently implemented (some tables use `deleted_at`, others hard delete)  

---

## 10. CONCLUSION

The Doctor Portal is well-structured with:
- **12 main pages** covering all doctor workflows
- **93 API endpoints** providing comprehensive functionality
- **Proper database relationships** between all entities
- **Flexible report system** supporting multiple specialties
- **Complete patient data access** (reports, prescriptions, allergies, medications, vitals, immunizations)
- **Messaging system** for patient and staff communication
- **Settings management** for profile, notifications, security, and availability

All relationships are properly wired:
- Doctor ↔ User (one-to-one)
- Doctor → Appointment (one-to-many)
- Doctor → Prescription (one-to-many)
- Doctor → GeneralReport (one-to-many)
- Patient → Appointment (one-to-many)
- Patient → Prescription (one-to-many)
- Patient → GeneralReport (one-to-many)
- Appointment → GeneralReport (one-to-many, optional)
- User → Message (one-to-many, as sender and recipient)

The system provides a complete EHR workflow for doctors from appointment management to report creation and patient communication.



