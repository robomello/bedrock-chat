"""Table creation on startup."""
from backend.database.models import Base


def init_database(engine):
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
