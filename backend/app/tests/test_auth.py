import pytest
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager
from app.main import app

@pytest.mark.asyncio
async def test_register_test_user():
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            res = await ac.post("/auth/register", json={
                "username": "testuser",
                "password": "testpass",
                "role": "doctor"
            })
            print("Status:", res.status_code)
            print("Response:", res.text)
            assert res.status_code in [200, 400]
