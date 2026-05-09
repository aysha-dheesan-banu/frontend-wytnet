from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Dict
import json
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, TokenResponse
from app.services.user_service import create_user, get_user_by_email
from app.core.hashing import verify_password
from app.core.security import create_access_token, create_refresh_token

router = APIRouter(prefix='/api/auth', tags=['auth'])

@router.post('/register', response_model=UserResponse)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_email(db, data.email):
        raise HTTPException(400, 'Email already registered')
    return create_user(db, data)

@router.post('/login', response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_email(db, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, 'Invalid credentials')
    return TokenResponse(
        access_token=create_access_token({'sub': user.email}),
        refresh_token=create_refresh_token({'sub': user.email})
    )

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, request_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[request_id] = websocket

    def disconnect(self, request_id: str):
        if request_id in self.active_connections:
            del self.active_connections[request_id]

    async def send_personal_message(self, message: dict, request_id: str):
        if request_id in self.active_connections:
            await self.active_connections[request_id].send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/auth/{request_id}")
async def websocket_auth(websocket: WebSocket, request_id: str):
    await manager.connect(request_id, websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(request_id)

@router.post("/confirm")
async def confirm_auth(data: dict):
    request_id = data.get("request_id")
    token = data.get("access_token")
    user_details = data.get("user")
    
    if not request_id or not token:
        raise HTTPException(400, "Missing request_id or access_token")
        
    await manager.send_personal_message({
        "status": "success",
        "access_token": token,
        "user": user_details
    }, request_id)
    
    return {"message": "Auth confirmed and sent to client"}
