import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////data/spread.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE raw_scrapes ADD COLUMN book_id INTEGER REFERENCES books(id) ON DELETE SET NULL"
            ))
            conn.commit()
        except Exception:
            pass  # Column already exists
