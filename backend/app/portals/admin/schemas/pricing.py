from pydantic import BaseModel
from app.common.schemas.common import IDModel

class ServicePricingBase(BaseModel):
    service: str
    department: str
    price: int
    currency: str = "UZS"

class ServicePricingCreate(ServicePricingBase):
    pass

class ServicePricingUpdate(ServicePricingBase):
    pass

class ServicePricingResponse(ServicePricingBase, IDModel):
    pass
