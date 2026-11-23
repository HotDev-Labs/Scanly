import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base, SessionLocal
from .models import User, Passenger, Luggage
from .auth import seed_default_users
from .services.import_service import parse_and_validate_csv_content, execute_import_passengers
from .routers import (
    auth_routes,
    passenger_routes,
    luggage_routes,
    verification_routes,
    stats_routes,
    import_routes,
)

SAMPLE_CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data", "sample_passengers.csv")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    Base.metadata.create_all(bind=engine)
    
    # Ensure batch_name and display_id columns exist in passengers table
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE passengers ADD COLUMN batch_name VARCHAR(100) DEFAULT 'Trip 1'"))
    except Exception:
        pass

    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE passengers ADD COLUMN display_id VARCHAR(50)"))
    except Exception:
        pass

    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("UPDATE passengers SET display_id = passenger_id WHERE display_id IS NULL"))
    except Exception:
        pass

    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(100)"))
    except Exception:
        pass

    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE passengers ADD COLUMN agent_id INTEGER"))
    except Exception:
        pass

    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE passengers ADD COLUMN agent_email VARCHAR(100)"))
    except Exception:
        pass

    # Seed default users
    db = SessionLocal()
    try:
        seed_default_users(db)
        
        # If database has no passengers, seed all 40 passengers without generating QR codes
        existing_count = db.query(Passenger).count()
        if existing_count == 0 and os.path.exists(SAMPLE_CSV_PATH):
            with open(SAMPLE_CSV_PATH, "r", encoding="utf-8") as f:
                content = f.read()
            preview = parse_and_validate_csv_content(content, db)
            valid_rows = [row for row in preview.rows if row.is_valid]
            execute_import_passengers(db, valid_rows)
            print(f"Auto-seeded {len(valid_rows)} passengers with 0 QR codes generated.")
    finally:
        db.close()

    yield

app = FastAPI(
    title="Scanly API",
    description="Backend API for Scanly luggage verification, QR generation, tracking, and Google Sheets/CSV import.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_routes.router)
app.include_router(passenger_routes.router)
app.include_router(luggage_routes.router)
app.include_router(verification_routes.router)
app.include_router(stats_routes.router)
app.include_router(import_routes.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}

# Mount frontend build if it exists
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def serve_frontend(request: Request, full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail=f"API route '/{full_path}' not found")
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(
            os.path.join(frontend_dist, "index.html"),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
else:
    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def fallback_route(request: Request, full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail=f"API route '/{full_path}' not found")
        return {
            "app": "Smart Passenger Luggage Verification System",
            "status": "online",
            "docs": "/docs"
        }
