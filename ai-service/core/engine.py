import cv2
import numpy as np
from insightface.app import FaceAnalysis
from typing import List, Optional, Tuple
import os

class FaceRecognitionEngine:
    def __init__(self, model_name='buffalo_l', ctx_id=0):
        # Initialize the FaceAnalysis module from InsightFace
        self.app = FaceAnalysis(name=model_name, root=os.environ.get('MODEL_PATH', './models'))
        # ctx_id=0 means GPU if available, else -1 for CPU
        self.app.prepare(ctx_id=ctx_id, det_size=(640, 640))
        
    def detect_and_extract(self, image: np.ndarray) -> List[dict]:
        """
        Takes a BGR image (cv2 format) and returns a list of dictionaries 
        containing bounding boxes, landmarks, and embeddings for each detected face.
        """
        faces = self.app.get(image)
        results = []
        for face in faces:
            results.append({
                'bbox': face.bbox.tolist(),
                'kps': face.kps.tolist(),
                'det_score': float(face.det_score),
                'embedding': face.normed_embedding.tolist() # 512-d vector
            })
        return results

    def compare_embeddings(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Computes cosine similarity between two normalized embeddings.
        Returns a score between -1 and 1.
        """
        sim = np.dot(emb1, emb2.T)
        return float(sim)

    def identify_face(self, query_emb: np.ndarray, gallery_embs: List[np.ndarray], gallery_ids: List[str], threshold: float = 0.5) -> Tuple[Optional[str], float]:
        """
        Compare query embedding against a gallery of embeddings.
        Returns the (best_match_id, confidence) if confidence > threshold, else (None, 0).
        """
        if not gallery_embs:
            return None, 0.0

        gallery_matrix = np.array(gallery_embs)
        similarities = np.dot(gallery_matrix, query_emb.T)
        
        best_idx = np.argmax(similarities)
        best_score = similarities[best_idx]
        
        if best_score >= threshold:
            return gallery_ids[best_idx], float(best_score)
        
        return None, float(best_score)

# Singleton instance
engine = FaceRecognitionEngine(ctx_id=-1) # Default to CPU for broad compatibility
