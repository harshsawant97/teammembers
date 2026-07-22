from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import cv2
import numpy as np
from core.engine import engine

app = FastAPI(title="Smart Attendance AI Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "AI Face Recognition"}

def load_image_from_upload(file: UploadFile) -> np.ndarray:
    contents = file.file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

@app.post("/api/v1/enroll")
async def enroll_face(student_id: str = Form(...), file: UploadFile = File(...)):
    img = load_image_from_upload(file)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
        
    faces = engine.detect_and_extract(img)
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected")
    if len(faces) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected. Please upload a clear photo of a single person.")
        
    face = faces[0]
    if face['det_score'] < 0.6:
        raise HTTPException(status_code=400, detail="Face detection score too low. Quality insufficient.")
        
    embedding = face['embedding']
    
    # In a real setup, we would save this embedding to the PostgreSQL DB via an API call or direct DB connection.
    # For now, we return it so the backend can store it.
    
    return {
        "status": "success", 
        "student_id": student_id, 
        "embedding": embedding,
        "det_score": face['det_score']
    }

class RecognitionRequest(BaseModel):
    session_id: str
    gallery_ids: list[str]
    gallery_embs: list[list[float]]

@app.post("/api/v1/recognize")
async def recognize_face(
    session_id: str = Form(...), 
    file: UploadFile = File(...),
    # In production, gallery would be fetched dynamically or passed from backend to avoid latency,
    # or cached in a fast vector DB like FAISS/Redis.
):
    img = load_image_from_upload(file)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    faces = engine.detect_and_extract(img)
    if len(faces) == 0:
        return {"status": "success", "session_id": session_id, "recognized": []}

    results = []
    
    # Mocking gallery fetch for architecture completeness
    # Ideally: gallery_embs, gallery_ids = fetch_roster_embeddings(session_id)
    gallery_embs = [] # to be replaced with actual DB fetch
    gallery_ids = []

    for face in faces:
        emb = np.array(face['embedding'])
        best_match_id, confidence = engine.identify_face(emb, gallery_embs, gallery_ids, threshold=0.5)
        
        results.append({
            "bbox": face['bbox'],
            "student_id": best_match_id,
            "confidence": confidence,
            "is_unknown": best_match_id is None
        })

    return {"status": "success", "session_id": session_id, "recognized": results}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
