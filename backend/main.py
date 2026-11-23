import sys
import os
import traceback

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.main import app
except Exception as e:
    err_tb = traceback.format_exc()
    print(f"[Scanly Backend Boot Error]: {err_tb}", file=sys.stderr)
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    app = FastAPI(title="Scanly Fallback")

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def boot_error(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "boot_error": True,
                "message": str(e),
                "traceback": err_tb.split("\n"),
                "python": sys.version
            }
        )

__all__ = ["app"]
