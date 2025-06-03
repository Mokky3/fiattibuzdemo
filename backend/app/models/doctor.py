from sqlalchemy import Column, Integer, String
from app.db.database import Base

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)
    phone = Column(String)
    email = Column(String)
