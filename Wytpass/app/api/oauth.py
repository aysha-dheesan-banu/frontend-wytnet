from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.client import OAuthClient
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.services.user_service import get_user_by_email
from app.core.hashing import verify_password
import secrets

router = APIRouter(prefix='/oauth', tags=['oauth'])
auth_codes = {}  # In production: use Redis

@router.get('/authorize')
def authorize(client_id: str, redirect_uri: str, email: str, password: str,
              db: Session = Depends(get_db)):
    client = db.query(OAuthClient).filter(OAuthClient.client_id == client_id).first()
    if not client or redirect_uri not in client.redirect_uris:
        raise HTTPException(400, 'Invalid client or redirect_uri')
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(401, 'Invalid credentials')
    code = secrets.token_urlsafe(32)
    auth_codes[code] = user.email
    return RedirectResponse(f'{redirect_uri}?code={code}')

@router.post('/token')
def exchange_code(code: str, client_id: str, client_secret: str,
                  db: Session = Depends(get_db)):
    client = db.query(OAuthClient).filter(OAuthClient.client_id == client_id,
             OAuthClient.client_secret == client_secret).first()
    if not client:
        raise HTTPException(401, 'Invalid client credentials')
    email = auth_codes.pop(code, None)
    if not email:
        raise HTTPException(400, 'Invalid or expired code')
    return {'access_token': create_access_token({'sub': email}),
            'refresh_token': create_refresh_token({'sub': email}),
            'token_type': 'bearer'}
