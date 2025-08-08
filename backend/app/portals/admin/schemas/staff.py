from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.common.schemas.common import IDModel

class StaffUserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    department: str

class StaffUserCreate(StaffUserBase):
    pass

class StaffUserUpdate(StaffUserBase):
    status: Optional[str]
    permissions: Optional[List[str]]

class StaffUserResponse(StaffUserBase, IDModel):
    status: str
    permissions: List[str]
