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
    
    # Try psycopg (v3), psycopg2, and pg8000 drivers in priority order
    drivers = [
        target_url,
        target_url.replace("postgresql://", "postgresql+psycopg2://", 1),
        target_url.replace("postgresql://", "postgresql+pg8000://", 1),
    ]
    from sqlalchemy.pool import NullPool
    for candidate in drivers:
        try:
            test_eng = create_engine(
                candidate,
                poolclass=NullPool,
                pool_pre_ping=True
            )
            test_eng.dialect.dbapi
            engine = test_eng
            DATABASE_URL = candidate
            print(f"[Scanly DB]: Configured PostgreSQL engine with {candidate.split('://')[0]}")
            break
        except Exception as e:
            print(f"[Scanly DB Warning]: PostgreSQL driver attempt failed for {candidate.split('://')[0]}: {e}")

if not engine:
    # On serverless (Vercel/Lambda) or read-only filesystem, always use /tmp
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or not os.access(".", os.W_OK):
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
