
from .appointments import (
    AppointmentBase,
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentInDB,
)

from .patients import (
    PatientBase,
    PatientCreate,
    PatientUpdate,
    PatientInDB,
)

from .prescriptions import (
    PrescriptionBase,
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionInDB,
)

from .messages import (
    MessageBase,
    MessageCreate,
    MessageInDB,
)

__all__ = [
    # appointments
    "AppointmentBase",
    "AppointmentCreate",
    "AppointmentUpdate",
    "AppointmentInDB",
    # patients
    "PatientBase",
    "PatientCreate",
    "PatientUpdate",
    "PatientInDB",
    # prescriptions
    "PrescriptionBase",
    "PrescriptionCreate",
    "PrescriptionUpdate",
    "PrescriptionInDB",
    # messages
    "MessageBase",
    "MessageCreate",
    "MessageInDB",
]
