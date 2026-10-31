import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

from app.main import app
from app.core.dependencies import get_current_user, get_db


class FakeResult:
    def __init__(self, value=None):
        self.value = value

    def scalar(self):
        return self.value

    def scalar_one_or_none(self):
        return self.value

    def scalar_one(self):
        return self.value

    def scalars(self):
        return SimpleNamespace(all=lambda: self.value or [])

    def mappings(self):
        return SimpleNamespace(all=lambda: self.value or [])

    def all(self):
        return self.value or []


class FakeSession:
    def __init__(self):
        self.items = []
        self.queries = []

    async def execute(self, query, params=None):
        self.queries.append((query, params))
        return FakeResult()

    def add(self, item):
        self.items.append(item)

    async def commit(self):
        return None

    async def refresh(self, item):
        return None

    async def delete(self, item):
        return None

    async def flush(self):
        return None


@pytest.fixture()
def fake_session():
    return FakeSession()


@pytest.fixture()
def client(fake_session):
    app.dependency_overrides[get_db] = lambda: fake_session
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1, email="student@example.com", username="student", password_hash="hashed", role="personal")
    app.state.fake_session = fake_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
