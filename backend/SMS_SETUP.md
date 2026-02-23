# SMS Notification Service Setup

This document describes how to configure the SMS notification service using the Eskiz.uz SMS gateway.

## Overview

The SMS notification service integrates with [Eskiz.uz](https://notify.eskiz.uz) SMS gateway to send SMS notifications for:
- Appointment confirmations and reminders
- User invitations
- Verification codes
- Lab results notifications
- Prescription notifications
- General messages

## Configuration

### Environment Variables

Add the following environment variables to your `backend/.env` file:

```env
# SMS Configuration
SMS_ENABLED=true
SMS_PROVIDER=eskiz

# Eskiz.uz Gateway Credentials
ESKIZ_EMAIL=your-email@example.com
ESKIZ_PASSWORD=your-password
ESKIZ_SENDER_ID=4546
```

### Environment Variables Description

- **SMS_ENABLED**: Enable or disable SMS sending (default: `true`)
- **SMS_PROVIDER**: SMS provider to use (`eskiz`, `twilio`, `sms_ru`)
- **ESKIZ_EMAIL**: Your Eskiz.uz account email
- **ESKIZ_PASSWORD**: Your Eskiz.uz account password
- **ESKIZ_SENDER_ID**: Sender ID for SMS messages (default: `4546`)

## Getting Eskiz.uz Credentials

1. Register an account at [Eskiz.uz](https://notify.eskiz.uz)
2. Log in to your account
3. Navigate to your profile settings
4. Copy your email and password
5. Get your sender ID from the dashboard

## Usage

### Basic SMS Sending

```python
from app.services.sms_notification_service import sms_notification_service

# Send a simple SMS
success = await sms_notification_service.send_sms(
    phone="998901234567",
    message="Your appointment is confirmed for tomorrow at 10:00 AM"
)
```

### Appointment Notifications

```python
# Send appointment notification
success = await sms_notification_service.send_appointment_sms(
    phone="998901234567",
    appointment_data={
        "date": "2025-01-15",
        "time": "10:00",
        "doctor": "Dr. Smith"
    },
    action="confirmed"
)
```

### Reminder Notifications

```python
# Send reminder
success = await sms_notification_service.send_reminder_sms(
    phone="998901234567",
    reminder_data={
        "date": "2025-01-15",
        "time": "10:00",
        "doctor": "Dr. Smith"
    },
    reminder_type="appointment"
)
```

### Invitation SMS

```python
# Send invitation
success = await sms_notification_service.send_invitation_sms(
    phone="998901234567",
    token="invitation-token-123",
    role="doctor",
    clinic="FIATTIB Medical Center"
)
```

### Verification Code SMS

```python
# Send verification code
success = await sms_notification_service.send_verification_code_sms(
    phone="998901234567",
    code="123456"
)
```

### Bulk SMS

```python
# Send to multiple recipients
recipients = [
    {"phone": "998901234567"},
    {"phone": "998901234568"},
    {"phone": "998901234569"}
]

result = await sms_notification_service.send_bulk_sms(
    recipients=recipients,
    message="Important announcement from FIATTIB Medical Center"
)

print(f"Success: {result['success_count']}, Failed: {result['failure_count']}")
```

## Phone Number Format

The service automatically formats phone numbers. Supported formats:
- `998901234567` (recommended)
- `+998901234567`
- `8901234567` (will be converted to 998901234567)
- `901234567` (will be converted to 998901234567)

## Error Handling

The service includes automatic:
- Token authentication and refresh
- Retry logic for failed requests
- Phone number formatting
- Error logging

## Testing

To test the SMS service:

```python
import asyncio
from app.services.sms_notification_service import sms_notification_service

async def test_sms():
    result = await sms_notification_service.send_sms(
        phone="998901234567",
        message="Test message from FIATTIB"
    )
    print(f"SMS sent: {result}")

asyncio.run(test_sms())
```

## API Reference

### SMSNotificationService

Main service class for sending SMS notifications.

#### Methods

- `send_sms(phone, message, sender_id=None)` - Send a simple SMS
- `send_appointment_sms(phone, appointment_data, action, reason=None)` - Send appointment notification
- `send_reminder_sms(phone, reminder_data, reminder_type)` - Send reminder
- `send_invitation_sms(phone, token, role, clinic, registration_url=None)` - Send invitation
- `send_verification_code_sms(phone, code)` - Send verification code
- `send_lab_result_sms(phone, patient_name)` - Send lab result notification
- `send_prescription_sms(phone, prescription_data)` - Send prescription notification
- `send_message_notification_sms(phone, sender)` - Send message notification
- `send_bulk_sms(recipients, message, sender_id=None)` - Send bulk SMS

## Troubleshooting

### SMS not sending

1. Check that `SMS_ENABLED=true` in your `.env` file
2. Verify Eskiz.uz credentials are correct
3. Check application logs for error messages
4. Ensure your Eskiz.uz account has sufficient balance

### Authentication errors

- Verify your email and password are correct
- Check that your Eskiz.uz account is active
- The service will automatically retry authentication if token expires

### Phone number format issues

- Ensure phone numbers are in the correct format (998XXXXXXXXX)
- The service will attempt to auto-format phone numbers

## Integration with Existing Services

The SMS service is automatically integrated with:
- `app.common.services.notification_service.SMSService`
- `app.common.services.sms`
- `app.services.notification_service.NotificationService`

No additional configuration needed - just set the environment variables and the service will be used automatically.

## Security Notes

- Never commit your `.env` file with credentials
- Use environment variables for all sensitive data
- Rotate your Eskiz.uz password regularly
- Monitor SMS usage to detect unauthorized access

