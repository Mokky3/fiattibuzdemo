from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.db.database import Base
import re
from datetime import datetime, timedelta
import uuid


class Patient(Base):
    __tablename__ = "patients"

    # Keep your existing fields
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    birth_date = Column(Date)
    phone = Column(String)
    email = Column(String)
    passport_number = Column(String)
    address = Column(String)
    
    # New enhanced fields
    patient_id = Column(String(20), unique=True, index=True, nullable=True)  # Auto-generated ID
    emergency_contact = Column(String, nullable=True)
    pinfl = Column(String(14), unique=True, nullable=True, index=True)  # For Uzbekistan
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.patient_id:
            self.patient_id = self.generate_patient_id()
    
    @staticmethod
    def generate_patient_id():
        """Generate unique patient ID"""
        timestamp = datetime.now().strftime("%Y%m%d")
        unique_part = str(uuid.uuid4())[:8].upper()
        return f"PAT-{timestamp}-{unique_part}"
    
    @staticmethod
    def validate_pinfl(pinfl: str) -> bool:
        """Validate PINFL format (14 digits)"""
        return bool(re.match(r'^\d{14}$', pinfl)) if pinfl else True
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format (+998XXXXXXXXX)"""
        return bool(re.match(r'^\+998\d{9}$', phone))
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        if not email:
            return True
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def to_dict(self, include_sensitive=False):
        """Convert patient object to dictionary"""
        data = {
            'id': self.id,
            'patient_id': self.patient_id,
            'full_name': self.full_name,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'gender': self.gender,
            'phone': self.phone,
            'email': self.email,
            'passport_number': self.passport_number,
            'address': self.address,
            'emergency_contact': self.emergency_contact,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_sensitive:
            data['pinfl'] = self.pinfl
            
        return data


class PatientInvitation(Base):
    __tablename__ = "patient_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=False, index=True)
    invitation_token = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)
    
    def __init__(self, patient_id: int, **kwargs):
        super().__init__(**kwargs)
        self.patient_id = patient_id
        self.invitation_token = str(uuid.uuid4())
        self.expires_at = datetime.utcnow() + timedelta(days=7)  # 7 days expiry
    
    def is_valid(self) -> bool:
        """Check if invitation is still valid"""
        return not self.used and datetime.utcnow() < self.expires_at
    
    def mark_as_used(self):
        """Mark invitation as used"""
        self.used = True
        self.used_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert invitation object to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'invitation_token': self.invitation_token,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'used': self.used,
            'used_at': self.used_at.isoformat() if self.used_at else None
        }