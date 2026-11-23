"""
Main entrypoint for FastAPI application on Vercel or ASGI servers.
Includes a fail-safe diagnostic fallback to pinpoint any serverless boot exceptions.
"""
import sys
import os
import json
import traceback

try:
    from app.main import app
except Exception as import_exc:
    import_error_text = traceback.format_exc()
    print(f"[Scanly Fatal Boot Error]:\n{import_error_text}", file=sys.stderr)

    # Raw ASGI fallback: Guarantees Vercel NEVER crashes with opaque FUNCTION_INVOCATION_FAILED
    async def app(scope, receive, send):
        if scope["type"] == "http":
            body = json.dumps({
                "error": "Backend Initialization Failed",
                "exception": str(import_exc),
                "type": type(import_exc).__name__,
                "traceback": import_error_text.split("\n"),
                "python_version": sys.version
            }, indent=2).encode("utf-8")
            
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [
                    [b"content-type", b"application/json"],
                    [b"content-length", str(len(body)).encode("utf-8")],
                    [b"access-control-allow-origin", b"*"]
                ]
            })
            await send({
                "type": "http.response.body",
                "body": body
            })
        elif scope["type"] == "lifespan":
            while True:
                message = await receive()
                if message["type"] == "lifespan.startup":
                    await send({"type": "lifespan.startup.complete"})
                elif message["type"] == "lifespan.shutdown":
                    await send({"type": "lifespan.shutdown.complete"})
                    break

__all__ = ["app"]
