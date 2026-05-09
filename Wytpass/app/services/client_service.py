from typing import Optional, List
from sqlalchemy.orm import Session
import secrets
import json
from uuid import UUID

from app.models.client import OAuthClient
from app.schemas.client import ClientCreate, ClientUpdate

def get_clients(db: Session, skip: int = 0, limit: int = 100) -> List[OAuthClient]:
    return db.query(OAuthClient).offset(skip).limit(limit).all()

def get_client_by_id(db: Session, client_id: UUID) -> Optional[OAuthClient]:
    return db.query(OAuthClient).filter(OAuthClient.id == client_id).first()

def get_client_by_client_id(db: Session, client_id: str) -> Optional[OAuthClient]:
    return db.query(OAuthClient).filter(OAuthClient.client_id == client_id).first()

def create_client(db: Session, data: ClientCreate) -> OAuthClient:
    client = OAuthClient(
        client_id=f'app_{secrets.token_hex(8)}',
        client_secret=secrets.token_hex(32),
        app_name=data.app_name,
        redirect_uris=json.dumps(data.redirect_uris)
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

def update_client(db: Session, client_id: UUID, data: ClientUpdate) -> Optional[OAuthClient]:
    client = get_client_by_id(db, client_id)
    if not client:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    if "redirect_uris" in update_data:
        update_data["redirect_uris"] = json.dumps(update_data.pop("redirect_uris"))
        
    for key, value in update_data.items():
        setattr(client, key, value)
        
    db.commit()
    db.refresh(client)
    return client

def delete_client(db: Session, client_id: UUID) -> bool:
    client = get_client_by_id(db, client_id)
    if not client:
        return False
    db.delete(client)
    db.commit()
    return True
