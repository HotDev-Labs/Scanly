import sys
import os
import traceback

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

for p in [root_dir, backend_dir, current_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app.main import app
except Exception as e1:
    try:
        from app.main import app
    except Exception as e2:
        err_msg = traceback.format_exc()
        print(f"[api/index.py fatal startup error]: {err_msg}")
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse
        app = FastAPI(title="Scanly Diagnostic API")

        @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
        async def diagnostic_fallback(path: str):
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Backend initialization failed",
                    "exception": str(e2),
                    "traceback": err_msg,
                    "sys_path": sys.path
                }
            )

__all__ = ["app"]
