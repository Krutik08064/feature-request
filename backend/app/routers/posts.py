from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from pymongo import ReturnDocument
import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.db.mongodb import get_database
from app.models.user import UserInDB
from app.models.post import (
    PostCategory,
    PostStatus,
    PostSort,
    PostCreateRequest,
    PostUpdateRequest,
    PostStatusUpdateRequest,
    PostResponse,
    PostListResponse,
    PostAuthor,
)
from app.routers.auth import get_current_user, get_current_user_optional, require_admin

router = APIRouter(prefix="/api/posts", tags=["posts"])

def serialize_post(post_doc: Dict[str, Any], current_user_id: Optional[str] = None) -> PostResponse:
    upvoted_by = post_doc.get("upvoted_by", [])
    has_voted = bool(current_user_id and current_user_id in upvoted_by)
    
    author_info = post_doc.get("author", {})
    author = PostAuthor(
        id=str(author_info.get("id", post_doc.get("author_id", ""))),
        name=author_info.get("name", "Anonymous"),
        avatar_url=author_info.get("avatar_url")
    )
    
    return PostResponse(
        id=str(post_doc["_id"]),
        title=post_doc["title"],
        description=post_doc["description"],
        category=PostCategory(post_doc["category"]),
        status=PostStatus(post_doc.get("status", PostStatus.UNDER_REVIEW.value)),
        author=author,
        vote_count=post_doc.get("vote_count", len(upvoted_by)),
        comment_count=post_doc.get("comment_count", 0),
        has_voted=has_voted,
        created_at=post_doc.get("created_at", datetime.utcnow()),
        updated_at=post_doc.get("updated_at", datetime.utcnow()),
    )

@router.get("", response_model=PostListResponse)
async def list_posts(
    category: Optional[PostCategory] = Query(None, description="Filter by category"),
    status: Optional[PostStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search term for title & description"),
    sort: PostSort = Query(PostSort.TOP, description="Sort order: top, newest, discussed"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: Optional[UserInDB] = Depends(get_current_user_optional),
):
    """Retrieves paginated posts with filtering, full-text search, and sorting."""
    db = get_database()
    query_filter: Dict[str, Any] = {}
    
    if category:
        query_filter["category"] = category.value
    if status:
        query_filter["status"] = status.value
    
    if search and search.strip():
        term = search.strip()
        # Use regex for flexible partial and substring search
        regex_pattern = re.compile(re.escape(term), re.IGNORECASE)
        query_filter["$or"] = [
            {"title": {"$regex": regex_pattern}},
            {"description": {"$regex": regex_pattern}},
        ]
    
    # Sorting logic
    sort_criteria = []
    if sort == PostSort.TOP:
        sort_criteria = [("vote_count", -1), ("created_at", -1)]
    elif sort == PostSort.NEWEST:
        sort_criteria = [("created_at", -1)]
    elif sort == PostSort.DISCUSSED:
        sort_criteria = [("comment_count", -1), ("created_at", -1)]
    
    skip = (page - 1) * limit
    total = await db.posts.count_documents(query_filter)
    pages = (total + limit - 1) // limit if total > 0 else 1
    
    cursor = db.posts.find(query_filter).sort(sort_criteria).skip(skip).limit(limit)
    post_docs = await cursor.to_list(length=limit)
    
    user_id = current_user.id if current_user else None
    items = [serialize_post(doc, user_id) for doc in post_docs]
    
    return PostListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )

@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    body: PostCreateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Submits a new feature request with default 'Under Review' status."""
    db = get_database()
    now = datetime.utcnow()
    
    post_doc = {
        "title": body.title.strip(),
        "description": body.description.strip(),
        "category": body.category.value,
        "status": PostStatus.UNDER_REVIEW.value,
        "author_id": current_user.id,
        "author": {
            "id": current_user.id,
            "name": current_user.name,
            "avatar_url": current_user.avatar_url,
        },
        "upvoted_by": [],
        "vote_count": 0,
        "comment_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.posts.insert_one(post_doc)
    post_doc["_id"] = result.inserted_id
    
    return serialize_post(post_doc, current_user.id)

@router.get("/{id}", response_model=PostResponse)
async def get_post(
    id: str,
    current_user: Optional[UserInDB] = Depends(get_current_user_optional)
):
    """Fetches full details of a feature request."""
    db = get_database()
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid post ID.")
    
    post_doc = await db.posts.find_one({"_id": obj_id})
    if not post_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    
    user_id = current_user.id if current_user else None
    return serialize_post(post_doc, user_id)

@router.patch("/{id}/vote", response_model=PostResponse)
async def toggle_vote(
    id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Atomic MongoDB voting engine.
    Uses $addToSet / $pull + $inc in single atomic operations to prevent race conditions
    and achieve idempotent toggle behavior.
    """
    db = get_database()
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid post ID.")
    
    user_id = str(current_user.id)
    
    # Check current state to determine toggle direction
    post_doc = await db.posts.find_one({"_id": obj_id})
    if not post_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    
    has_voted_already = user_id in post_doc.get("upvoted_by", [])
    
    if has_voted_already:
        # Atomic pull and decrement
        updated = await db.posts.find_one_and_update(
            {"_id": obj_id, "upvoted_by": user_id},
            {
                "$pull": {"upvoted_by": user_id},
                "$inc": {"vote_count": -1},
                "$set": {"updated_at": datetime.utcnow()}
            },
            return_document=ReturnDocument.AFTER
        )
        if not updated:
            # Race condition: another concurrent request already pulled it
            updated = await db.posts.find_one({"_id": obj_id})
    else:
        # Atomic addToSet and increment
        updated = await db.posts.find_one_and_update(
            {"_id": obj_id, "upvoted_by": {"$ne": user_id}},
            {
                "$addToSet": {"upvoted_by": user_id},
                "$inc": {"vote_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            },
            return_document=ReturnDocument.AFTER
        )
        if not updated:
            # Race condition: another concurrent request already added it
            updated = await db.posts.find_one({"_id": obj_id})
            
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        
    return serialize_post(updated, user_id)

@router.patch("/{id}/status", response_model=PostResponse)
async def update_post_status(
    id: str,
    body: PostStatusUpdateRequest,
    current_admin: UserInDB = Depends(require_admin)
):
    """Admin-only endpoint to transition post status (Under Review -> Planned -> In Progress -> Completed)."""
    db = get_database()
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid post ID.")
    
    updated = await db.posts.find_one_and_update(
        {"_id": obj_id},
        {
            "$set": {
                "status": body.status.value,
                "updated_at": datetime.utcnow()
            }
        },
        return_document=ReturnDocument.AFTER
    )
    
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        
    return serialize_post(updated, current_admin.id)
