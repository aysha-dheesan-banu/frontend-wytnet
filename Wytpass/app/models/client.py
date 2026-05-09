from sqlalchemy import Column, String, Text, Uuid
import uuid
from app.database import Base

class OAuthClient(Base):
    __tablename__ = 'oauth_clients'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(String, unique=True, index=True, nullable=False)
    client_secret = Column(String, nullable=False)
    app_name = Column(String, nullable=False)
    redirect_uris = Column(Text, nullable=False)  # JSON list
