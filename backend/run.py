"""
run.py — Unified FastAPI launcher for AI Resume Screening backend.
Runs all 9 screens on port 8000.
"""
import uvicorn
from app.config import get_settings

if __name__ == "__main__":
    cfg = get_settings()
    uvicorn.run(
        "app.main:app",
        host=cfg.host,
        port=cfg.port,
        reload=not cfg.is_production,
    )
