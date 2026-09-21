from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging
from app.core.config import settings

logger = logging.getLogger("app.db")

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

mongodb = MongoDB()

async def connect_to_mongo() -> None:
    """Initializes the MongoDB connection and ensures collections and indexes exist."""
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    mongodb.client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongodb.db = mongodb.client[settings.MONGODB_DB_NAME]
    
    # Verify connection
    await mongodb.client.admin.command('ping')
    logger.info("Successfully connected to MongoDB.")

    # Create Indexes
    # Users
    await mongodb.db.users.create_index("email", unique=True)
    await mongodb.db.users.create_index("role")
    
    # Posts
    await mongodb.db.posts.create_index([("title", "text"), ("description", "text")])
    await mongodb.db.posts.create_index("status")
    await mongodb.db.posts.create_index("category")
    await mongodb.db.posts.create_index("vote_count")
    await mongodb.db.posts.create_index("created_at")
    await mongodb.db.posts.create_index("author_id")
    
    # Comments
    await mongodb.db.comments.create_index("post_id")
    await mongodb.db.comments.create_index("parent_comment_id")
    await mongodb.db.comments.create_index("created_at")
    await mongodb.db.comments.create_index("author_id")

    logger.info("MongoDB indexes verified and ensured.")

async def close_mongo_connection() -> None:
    """Closes the MongoDB connection."""
    if mongodb.client:
        logger.info("Closing MongoDB connection...")
        mongodb.client.close()
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    """Returns the database instance."""
    if mongodb.db is None:
        raise RuntimeError("Database connection has not been initialized.")
    return mongodb.db
