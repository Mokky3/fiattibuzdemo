from pydantic import BaseModel
from typing import Optional
from app.common.schemas.common import IDModel

class DepartmentBase(BaseModel):
    name: str
    head: Optional[str] = None
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase, IDModel):
    status: str
    staff: int
    patients: int
