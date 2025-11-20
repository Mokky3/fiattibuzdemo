# Centralized Services for Cross-Portal Functionality

This directory contains centralized services that eliminate code duplication across all portals and provide consistent business logic, security, and FHIR integration.

## Services Overview

### 1. AppointmentsService
**File:** `appointments_service.py`

Centralized appointment management across all portals.

**Features:**
- Create, confirm, decline, complete appointments
- Doctor availability checking and slot management
- Patient and doctor appointment retrieval
- Rescheduling with conflict detection
- Automatic notifications
- FHIR Appointment resource synchronization

**Key Methods:**
```python
# Create appointment with validation
await appointments_service.create_appointment(request)

# Confirm/decline appointments
await appointments_service.confirm_appointment(appointment_id, user_id, reason)
await appointments_service.decline_appointment(appointment_id, user_id, reason)

# Check doctor availability
await appointments_service.check_doctor_availability(doctor_id, date, time, duration)
await appointments_service.get_doctor_availability(request)

# Get appointments by user
appointments_service.get_patient_appointments(patient_id, scope="upcoming")
appointments_service.get_doctor_appointments(doctor_id, date, status)
```

### 2. MessagingService
**File:** `messaging_service.py`

Unified messaging system with thread management, read receipts, and attachments.

**Features:**
- Send messages with template support
- Conversation thread management
- Read receipt tracking
- File attachment handling
- System message delivery
- Real-time notifications
- FHIR Communication resource synchronization

**Key Methods:**
```python
# Send messages
await messaging_service.send_message(request)
await messaging_service.send_system_message(recipient_id, subject, content)

# Thread management
await messaging_service.get_conversation_thread(thread_id, user_id)
await messaging_service.get_user_conversations(user_id)

# Read receipts
await messaging_service.mark_message_read(message_id, user_id)
await messaging_service.mark_conversation_read(thread_id, user_id)

# Attachments
await messaging_service.upload_attachment(message_id, file, user_id)
```

### 3. FHIRClient
**File:** `fhir_client.py`

Centralized FHIR resource operations for all healthcare data.

**Supported Resources:**
- Patient
- Practitioner
- Appointment
- MedicationRequest
- DocumentReference
- Observation
- Coverage
- Task
- Communication
- Binary

**Key Methods:**
```python
# Patient operations
await fhir_client.create_patient(patient)
await fhir_client.update_patient(patient)
await fhir_client.get_patient(patient_id)
await fhir_client.search_patients(params)

# Appointment operations
await fhir_client.create_appointment(appointment)
await fhir_client.update_appointment(appointment)
await fhir_client.search_appointments(params)

# Practitioner operations
await fhir_client.create_practitioner(doctor)
await fhir_client.search_practitioners(params)

# Medical operations
await fhir_client.create_medication_request(prescription)
await fhir_client.create_document_reference(document)
await fhir_client.create_observation(observation)
```

### 4. RBACService
**File:** `rbac_service.py`

Role-based access control with decorators and ownership checks.

**Features:**
- Role-based access control decorators
- Permission-based access control
- Resource ownership validation
- Patient-scoped resource access
- Automatic access checking

**Decorators:**
```python
# Role-based decorators
@require_doctor_access()
@require_patient_access()
@require_receptionist_access()
@require_admin_access()
@require_staff_access()

# Ownership decorators
@require_patient_ownership()
@require_appointment_ownership()
@require_prescription_ownership()
@require_medical_record_ownership()
@require_message_ownership()

# Custom decorators
@rbac_service.require_roles(["doctor", "nurse"])
@rbac_service.require_permissions(["patient.view", "appointment.create"])
```

## Usage Examples

### Portal Route Integration

```python
# Patient Portal - Appointment Booking
from app.services.appointments_service import AppointmentsService, AppointmentCreateRequest
from app.services.rbac_service import require_patient_access

@router.post("/appointments")
@require_patient_access()
async def book_appointment(
    data: AppointmentCreate,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    appointments_service = AppointmentsService(db)
    
    request = AppointmentCreateRequest(
        patient_id=current_patient.id,
        hospital_id=data.hospital_id,
        appointment_date=data.appointmentDate,
        appointment_time=data.appointmentTime,
        appointment_type=data.appointmentType,
        created_by=current_patient.id
    )
    
    appointment = await appointments_service.create_appointment(request)
    return {"id": str(appointment.id)}
```

### Doctor Portal - Appointment Management

```python
# Doctor Portal - Confirm Appointment
from app.services.appointments_service import AppointmentsService
from app.services.rbac_service import require_doctor_access, require_appointment_ownership

@router.post("/appointments/{appointment_id}/confirm")
@require_doctor_access()
@require_appointment_ownership()
async def confirm_appointment(
    appointment_id: str,
    reason: Optional[str] = None,
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    appointments_service = AppointmentsService(db)
    
    appointment = await appointments_service.confirm_appointment(
        appointment_id=appointment_id,
        user_id=current_doctor.id,
        reason=reason
    )
    
    return {"status": "confirmed", "appointment_id": appointment.id}
```

### Reception Portal - Messaging

```python
# Reception Portal - Send Patient Message
from app.services.messaging_service import MessagingService, SendMessageRequest
from app.services.rbac_service import require_receptionist_access

@router.post("/messages")
@require_receptionist_access()
async def send_patient_message(
    payload: SendMessage,
    current_receptionist: ReceptionistUser = Depends(get_current_receptionist),
    db: Session = Depends(get_db)
):
    messaging_service = MessagingService(db)
    
    request = SendMessageRequest(
        sender_id=current_receptionist.id,
        patient_id=payload.patient_id,
        content=payload.text,
        message_type=payload.message_type,
        template_id=payload.template_id
    )
    
    message = await messaging_service.send_message(request)
    return {"id": message.id, "sent_at": message.timestamp.isoformat()}
```

### Admin Portal - FHIR Operations

```python
# Admin Portal - Patient Search
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import require_admin_access

@router.get("/patients/search")
@require_admin_access()
async def search_patients(
    name: Optional[str] = None,
    email: Optional[str] = None
):
    fhir_client = FHIRClient()
    
    params = {}
    if name:
        params["name"] = name
    if email:
        params["email"] = email
    
    patients = await fhir_client.search_patients(params)
    return {"patients": patients.get("entry", [])}
```

## Configuration

### Environment Variables

```bash
# FHIR Configuration
FHIR_BASE_URL=http://localhost:8080/fhir
FHIR_AUTH_TOKEN=your_auth_token
FHIR_TIMEOUT=30
FHIR_MAX_RETRIES=3

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Messaging Configuration
MESSAGE_TEMPLATE_DIR=templates/messages
UPLOAD_DIR=uploads/messages
```

### Database Models

The services work with existing models:
- `app.common.models.appointment.Appointment`
- `app.common.models.patient.Patient`
- `app.common.models.doctor.Doctor`
- `app.common.models.messaging.Message`
- `app.common.models.medical.MedicalRecord`
- `app.common.models.prescription.Prescription`

## Security Features

### RBAC Implementation

1. **Role-Based Access**: Users can only access endpoints appropriate for their role
2. **Resource Ownership**: Users can only access resources they own or are authorized to access
3. **Permission-Based Access**: Fine-grained permissions for specific operations
4. **Patient Data Protection**: Patient-scoped resources are properly isolated

### Access Control Examples

```python
# Patient can only access their own data
@require_patient_access()
@require_patient_ownership()
async def get_patient_profile(patient_id: str):
    # Only accessible by the patient themselves
    pass

# Doctor can access their patients' data
@require_doctor_access()
async def get_doctor_patients():
    # Accessible by doctors to see their patients
    pass

# Receptionist can access all patient data
@require_receptionist_access()
async def search_all_patients():
    # Accessible by receptionists for administrative purposes
    pass
```

## Error Handling

All services provide consistent error handling:

```python
# Service exceptions
HTTPException(status_code=404, detail="Resource not found")
HTTPException(status_code=403, detail="Access denied")
HTTPException(status_code=409, detail="Conflict - resource already exists")
HTTPException(status_code=400, detail="Invalid request data")
HTTPException(status_code=503, detail="Service unavailable")
```

## Testing

### Service Testing

```python
# Test appointment service
async def test_create_appointment():
    appointments_service = AppointmentsService(test_db)
    request = AppointmentCreateRequest(...)
    appointment = await appointments_service.create_appointment(request)
    assert appointment.status == AppointmentStatus.PENDING

# Test messaging service
async def test_send_message():
    messaging_service = MessagingService(test_db)
    request = SendMessageRequest(...)
    message = await messaging_service.send_message(request)
    assert message.read == False

# Test RBAC service
async def test_patient_access():
    rbac_service = RBACService(test_db)
    has_access = await rbac_service.check_patient_access(user_id, patient_id)
    assert has_access == True
```

## Migration Benefits

1. **Code Reuse**: Eliminates duplicate code across portals
2. **Consistency**: Same business logic applied everywhere
3. **Maintainability**: Changes in one place affect all portals
4. **Security**: Centralized access control
5. **Testing**: Easier to test centralized services
6. **Performance**: Optimized database queries
7. **FHIR Compliance**: Standardized FHIR resource handling

## Next Steps

1. **Migrate Existing Routes**: Apply services to all portal routes
2. **Add Caching**: Implement Redis caching for frequently accessed data
3. **Add Monitoring**: Implement metrics and logging
4. **Add WebSocket Support**: Real-time notifications
5. **Add Bulk Operations**: Batch processing for large datasets
6. **Add Audit Logging**: Track all operations for compliance

## Support

For questions or issues with the centralized services:
1. Check the migration guide: `migration_guide.md`
2. Review the service documentation
3. Test with the provided examples
4. Contact the development team
