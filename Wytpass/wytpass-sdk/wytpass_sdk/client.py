import httpx
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

class WytPassClient:
    def __init__(self, base_url: str, client_id: str):
        self.base_url = base_url
        self.client_id = client_id
        self._scheme = OAuth2PasswordBearer(tokenUrl=f'{base_url}/api/auth/login')

    def get_current_user(self, token: str = None):
        r = httpx.get(f'{self.base_url}/api/userinfo',
                      headers={'Authorization': f'Bearer {token}'})
        if r.status_code != 200:
            raise HTTPException(401, 'Invalid token')
        return r.json()
