from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to PaisaWise API", "version": "1.0.0"}

def test_auth_and_protected_routes():
    # Login as seeded user
    login_data = {
        "email": "demo@paisawise.com",
        "password": "password"
    }
    resp = client.post("/api/v1/auth/login-json", json=login_data)
    assert resp.status_code == 200
    token_resp = resp.json()
    assert "access_token" in token_resp
    
    headers = {"Authorization": f"Bearer {token_resp['access_token']}"}
    
    # 1. Test GET /dashboard
    dash_resp = client.get("/api/v1/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["personal_spending"] > 0
    assert "money_movement" in dash_data
    
    # 2. Test GET /rules
    rules_resp = client.get("/api/v1/rules", headers=headers)
    assert rules_resp.status_code == 200
    rules = rules_resp.json()
    assert len(rules) > 0
    assert any(r["name"] == "Netflix Rule" for r in rules)

    # 3. Test GET /categories
    cat_resp = client.get("/api/v1/categories", headers=headers)
    assert cat_resp.status_code == 200
    categories = cat_resp.json()
    assert len(categories) > 0
