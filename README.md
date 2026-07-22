# Smart Attendance System

An enterprise-grade, AI-powered smart attendance system built with Node.js, Python FastAPI, React, and Flutter.

## Architecture

The system consists of 4 main components:
1. **Backend API**: Node.js, Express, TypeScript, Prisma, PostgreSQL. Handles CRUD, sessions, WebSockets, and Authentication.
2. **AI Microservice**: Python, FastAPI, InsightFace, ONNX Runtime. Processes images, detects faces, extracts embeddings, and compares them against roster galleries.
3. **Frontend Dashboard**: React, Vite, Tailwind CSS, Material UI. Used by Faculty and Admins to manage sessions, view live attendance via WebSockets, and manage students.
4. **Mobile App**: Flutter, Riverpod, MediaPipe. Used by mobile cameras in classrooms to detect faces and enqueue background uploads to the server.

## Getting Started

### Prerequisites
- Docker & Docker Compose

### Running the System
```bash
docker-compose up --build
```

### Services
- **Backend**: `http://localhost:3000`
- **AI Service**: `http://localhost:8000`
- **Dashboard**: `http://localhost:80` (or mapped port)
- **Database**: PostgreSQL on `localhost:5432`

## Documentation
For full API Documentation and Architecture Diagrams, see the `/docs` folder.
