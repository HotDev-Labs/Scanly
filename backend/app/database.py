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
    
    # Try connecting with PostgreSQL
    try:
        from sqlalchemy import text
        test_engine = create_engine(target_url, pool_pre_ping=True, pool_recycle=300)
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = test_engine
        DATABASE_URL = target_url
        print(f"[Scanly DB]: Successfully connected to PostgreSQL database")
    except Exception as e:
        print(f"[Scanly DB Warning]: PostgreSQL connection failed ({e}). Falling back to SQLite.")

if not engine:
    if os.getenv("VERCEL"):
        DATABASE_URL = "sqlite:////tmp/smart_luggage.db"
    else:
        DATABASE_URL = "sqlite:///./smart_luggage.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30.0})

# Enable Foreign Key enforcement in SQLite
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
