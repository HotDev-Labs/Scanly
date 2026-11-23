import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# Support Vercel Postgres / Neon Storage or generic DATABASE_URL
raw_url = (
    os.getenv("POSTGRES_URL") 
    or os.getenv("DATABASE_URL") 
    or os.getenv("POSTGRES_PRISMA_URL") 
    or os.getenv("POSTGRES_URL_NON_POOLING")
)

if raw_url:
    # SQLAlchemy requires postgresql:// instead of postgres://
    if raw_url.startswith("postgres://"):
        DATABASE_URL = raw_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = raw_url
elif os.getenv("VERCEL"):
    DATABASE_URL = "sqlite:////tmp/smart_luggage.db"
else:
    DATABASE_URL = "sqlite:///./smart_luggage.db"

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL settings for Vercel Serverless
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(DATABASE_URL, **engine_kwargs)

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
