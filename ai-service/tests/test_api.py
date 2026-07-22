from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "OK", "service": "AI Face Recognition"}

def test_enroll_missing_file():
    response = client.post("/api/v1/enroll", data={"student_id": "123"})
    # 422 Unprocessable Entity due to missing File
    assert response.status_code == 422
