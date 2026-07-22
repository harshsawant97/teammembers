# System Architecture

## Component Interaction

```mermaid
graph TD
    A[Flutter Camera App] -->|Face Crop HTTP POST| B(AI Service FastAPI)
    B -->|Cosine Similarity| C{Match Found?}
    C -->|Yes| D[Backend API Node.js]
    C -->|No| E[Unknown Face Queue]
    D -->|Mark Attendance| F[(PostgreSQL)]
    D -->|WebSocket Emit| G[React Faculty Dashboard]
```

## AI Pipeline Decision Engine

1. **Detection**: MediaPipe (Local Flutter App)
2. **Alignment & Embedding**: InsightFace ONNX (AI Service)
3. **Thresholding**: 0.5 Cosine Similarity
4. **Observation Count**: Must see face 3 times confidently before marking present.
