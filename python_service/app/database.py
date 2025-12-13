"""
Database module for MongoDB connection using Motor (async driver).
Provides connection pooling and collection access.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class Database:
    """MongoDB database connection manager."""
    
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    
    @classmethod
    async def connect(cls) -> None:
        """
        Connect to MongoDB using Motor async driver.
        Creates connection pool for efficient async operations.
        """
        try:
            cls.client = AsyncIOMotorClient(
                settings.mongodb_uri,
                maxPoolSize=50,
                minPoolSize=10,
                serverSelectionTimeoutMS=5000
            )
            
            # Extract database name from URI or use default
            db_name = settings.mongodb_uri.split("/")[-1].split("?")[0]
            if not db_name:
                db_name = "ai_consultant"
            
            cls.db = cls.client[db_name]
            
            # Verify connection
            await cls.client.admin.command("ping")
            logger.info(f"✅ Connected to MongoDB: {db_name}")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise
    
    @classmethod
    async def close(cls) -> None:
        """Close MongoDB connection."""
        if cls.client:
            cls.client.close()
            logger.info("🔌 MongoDB connection closed")
    
    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if cls.db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return cls.db
    
    # Collection accessors
    @classmethod
    def uploads(cls):
        """Get uploads collection."""
        return cls.get_db()["uploads"]
    
    @classmethod
    def kpisnapshots(cls):
        """Get kpisnapshots collection."""
        return cls.get_db()["kpisnapshots"]
    
    @classmethod
    def businesses(cls):
        """Get businesses collection."""
        return cls.get_db()["businesses"]
    
    @classmethod
    def feedbacks(cls):
        """Get feedbacks collection."""
        return cls.get_db()["feedbacks"]
    
    @classmethod
    def stafflogs(cls):
        """Get stafflogs collection."""
        return cls.get_db()["stafflogs"]
    
    @classmethod
    def issues(cls):
        """Get issues collection."""
        return cls.get_db()["issues"]


# Convenience functions
async def connect_db():
    """Connect to database."""
    await Database.connect()


async def close_db():
    """Close database connection."""
    await Database.close()


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance for dependency injection."""
    return Database.get_db()
