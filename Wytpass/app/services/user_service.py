from typing import Optional
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.hashing import hash_password
from sqlalchemy.orm import Session

def create_user(db: Session, data: UserCreate) -> User:
    user = User(email=data.email,
                hashed_password=hash_password(data.password),
                full_name=data.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return db.query(User).offset(skip).limit(limit).all()

def get_user_by_id(db: Session, user_id) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def update_user(db: Session, user_id, data) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))
        
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True
