from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from uuid import UUID

class ClientCreate(BaseModel):
    app_name: str
    redirect_uris: List[str]

class ClientUpdate(BaseModel):
    app_name: Optional[str] = None
    redirect_uris: Optional[List[str]] = None

class ClientResponse(BaseModel):
    id: UUID
    client_id: str
    client_secret: str
    app_name: str
    redirect_uris: str  # Note: The model stores this as a JSON string

    model_config = ConfigDict(from_attributes=True)
