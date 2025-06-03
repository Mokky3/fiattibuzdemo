from sqlalchemy import Column, Integer, String, Date
from app.db.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    birth_date = Column(Date)
    phone = Column(String)
    email = Column(String)
    passport_number = Column(String)
    address = Column(String)
