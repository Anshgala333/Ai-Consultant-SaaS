"""
Server startup script for the FastAPI data processor.
Run with: python run.py
"""

import uvicorn
import os
import sys

# Add the current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings


def main():
    """Start the FastAPI server."""
    print("""
╔═══════════════════════════════════════════════════════════╗
║   AI Consultant Data Processor                            ║
║   FastAPI Python Service                                  ║
╠═══════════════════════════════════════════════════════════╣
║   Starting server...                                      ║
╚═══════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
        access_log=True
    )


if __name__ == "__main__":
    main()
