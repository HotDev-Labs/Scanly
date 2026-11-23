import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

raw_url = (
    os.getenv("POSTGRES_URL") 
    or os.getenv("DATABASE_URL") 
    or os.getenv("POSTGRES_PRISMA_URL") 
    or os.getenv("POSTGRES_URL_NON_POOLING")
)

DATABASE_URL = None
engine = None

if raw_url:
    target_url = raw_url
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)
    
    # Try pg8000 first (pure python), then standard psycopg2
    try:
        from sqlalchemy.pool import NullPool
        for candidate_url in [
            target_url.replace("postgresql://", "postgresql+pg8000://", 1),
            target_url
        ]:
            try:
                candidate_eng = create_engine(
                    candidate_url,
                    poolclass=NullPool,
                    pool_pre_ping=True
                )
                candidate_eng.dialect.dbapi
                engine = candidate_eng
                DATABASE_URL = candidate_url
                print(f"[Scanly DB]: Successfully loaded driver for {candidate_url.split('://')[0]}")
                break
            except Exception as drv_err:
                print(f"[Scanly DB Warning]: Driver check failed for {candidate_url.split('://')[0]}: {drv_err}")
    except Exception as e:
        print(f"[Scanly DB Warning]: PostgreSQL setup failed ({e}). Falling back to SQLite.")

if not engine:
    if os.getenv("VERCEL"):
        DATABASE_URL = "sqlite:////tmp/smart_luggage.db"
    else:
        DATABASE_URL = "sqlite:///./smart_luggage.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30.0})

# Enable Foreign Key enforcement in SQLite
if DATABASE_URL and DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    try:
        from .main import init_db
        init_db()
    except Exception as e:
        print(f"[Scanly get_db init warning]: {e}")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
