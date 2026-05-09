from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.schemas.user import UserResponse
from app.models.user import User

router = APIRouter(prefix='/api', tags=['userinfo'])

@router.get('/userinfo', response_model=UserResponse)
def userinfo(current_user: User = Depends(get_current_user)):
    return current_user
