import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Expects standard postgres URL, falling back to a default for local development
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://admin:admin123@postgres:5432/smart_attendance"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def fetch_session_gallery(db_session, session_id: str):
    """
    Fetches the face embeddings for all students enrolled in the class associated with the given session.
    """
    query = text('''
        SELECT s.id as student_id, fe.embedding 
        FROM "Session" sess
        JOIN "ClassRoster" cr ON sess."classId" = cr."classId"
        JOIN "Student" s ON cr."studentId" = s.id
        JOIN "FaceSample" fs ON s.id = fs."studentId"
        JOIN "FaceEmbedding" fe ON fs.id = fe."faceSampleId"
        WHERE sess.id = :session_id AND fs."isActive" = true
    ''')
    
    result = db_session.execute(query, {"session_id": session_id}).fetchall()
    
    gallery_ids = []
    gallery_embs = []
    
    for row in result:
        gallery_ids.append(row.student_id)
        # Postgres returns array as list in Python via psycopg2
        gallery_embs.append(row.embedding)
        
    return gallery_embs, gallery_ids
