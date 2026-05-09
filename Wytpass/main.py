from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.api import auth, userinfo, oauth, clients, users

Base.metadata.create_all(bind=engine)

app = FastAPI(title='WytPass SSO', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(userinfo.router)
app.include_router(oauth.router)
app.include_router(clients.router)
app.include_router(users.router)
