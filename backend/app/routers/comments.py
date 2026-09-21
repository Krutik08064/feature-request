from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from app.db.mongodb import get_database
from app.models.user import UserInDB, UserRole
from app.models.comment import (
    CommentCreateRequest,
    CommentUpdateRequest,
    CommentResponse,
    CommentAuthor,
)
from app.routers.auth import get_current_user, require_admin

router = APIRouter(tags=["comments"])

def serialize_comment(doc: Dict[str, Any]) -> CommentResponse:
    is_deleted = doc.get("is_deleted", False)
    text = "[This comment has been deleted]" if is_deleted else doc["text"]
    
    author_info = doc.get("author", {})
    author = CommentAuthor(
        id=str(author_info.get("id", doc.get("author_id", ""))),
        name="[Deleted]" if is_deleted else author_info.get("name", "User"),
        avatar_url=None if is_deleted else author_info.get("avatar_url"),
        role=author_info.get("role", "user")
    )
    
    return CommentResponse(
        id=str(doc["_id"]),
        post_id=str(doc["post_id"]),
        author=author,
        text=text,
        parent_comment_id=str(doc["parent_comment_id"]) if doc.get("parent_comment_id") else None,
        is_deleted=is_deleted,
        created_at=doc.get("created_at", datetime.utcnow()),
        updated_at=doc.get("updated_at"),
        replies=[]
    )

@router.get("/api/posts/{id}/comments", response_model=List[CommentResponse])
async def list_comments(id: str):
    """Retrieves threaded comments for a post (1-level hierarchy)."""
    db = get_database()
    try:
        post_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid post ID.")
    
    # Fetch all comments for this post
    cursor = db.comments.find({"post_id": str(post_obj_id)}).sort("created_at", 1)
    all_comments = await cursor.to_list(length=1000)
    
    # Build tree: root comments and replies
    root_comments: List[CommentResponse] = []
    replies_map: Dict[str, List[CommentResponse]] = {}
    
    for doc in all_comments:
        serialized = serialize_comment(doc)
        parent_id = serialized.parent_comment_id
        if parent_id:
            if parent_id not in replies_map:
                replies_map[parent_id] = []
            replies_map[parent_id].append(serialized)
        else:
            root_comments.append(serialized)
            
    # Attach replies to parents
    for root in root_comments:
        root.replies = replies_map.get(root.id, [])
        
    return root_comments

@router.post("/api/posts/{id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    id: str,
    body: CommentCreateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Creates a new top-level comment or threaded reply."""
    db = get_database()
    try:
        post_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid post ID.")
    
    post = await db.posts.find_one({"_id": post_obj_id})
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        
    parent_comment_id = None
    if body.parent_comment_id:
        try:
            parent_obj_id = ObjectId(body.parent_comment_id)
            parent = await db.comments.find_one({"_id": parent_obj_id, "post_id": str(post_obj_id)})
            if not parent:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent comment not found.")
            # Flatten to 1-level threading: if parent has a parent, reply to root parent
            parent_comment_id = str(parent.get("parent_comment_id") or parent["_id"])
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parent comment ID.")

    now = datetime.utcnow()
    comment_doc = {
        "post_id": str(post_obj_id),
        "author_id": current_user.id,
        "author": {
            "id": current_user.id,
            "name": current_user.name,
            "avatar_url": current_user.avatar_url,
            "role": current_user.role.value,
        },
        "text": body.text.strip(),
        "parent_comment_id": parent_comment_id,
        "is_deleted": False,
        "created_at": now,
        "updated_at": None,
    }
    
    result = await db.comments.insert_one(comment_doc)
    comment_doc["_id"] = result.inserted_id
    
    # Increment comment_count denormalized on post
    await db.posts.update_one(
        {"_id": post_obj_id},
        {"$inc": {"comment_count": 1}, "$set": {"updated_at": now}}
    )
    
    return serialize_comment(comment_doc)

@router.patch("/api/posts/{id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    id: str,
    comment_id: str,
    body: CommentUpdateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Updates comment text (author or admin only)."""
    db = get_database()
    try:
        c_obj_id = ObjectId(comment_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid comment ID.")
        
    comment = await db.comments.find_one({"_id": c_obj_id, "post_id": id})
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")
        
    if comment.get("is_deleted", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot edit a deleted comment.")
        
    # Permission check: author or admin
    is_author = comment.get("author_id") == current_user.id
    is_admin = current_user.role == UserRole.ADMIN
    if not (is_author or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit this comment.")
        
    now = datetime.utcnow()
    await db.comments.update_one(
        {"_id": c_obj_id},
        {"$set": {"text": body.text.strip(), "updated_at": now}}
    )
    
    updated = await db.comments.find_one({"_id": c_obj_id})
    return serialize_comment(updated)

@router.delete("/api/posts/{id}/comments/{comment_id}", response_model=CommentResponse)
async def delete_comment(
    id: str,
    comment_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Soft-deletes a comment (author or admin only). Preserves thread tree structure."""
    db = get_database()
    try:
        c_obj_id = ObjectId(comment_id)
        post_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid ID.")
        
    comment = await db.comments.find_one({"_id": c_obj_id, "post_id": id})
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")
        
    if comment.get("is_deleted", False):
        return serialize_comment(comment)
        
    is_author = comment.get("author_id") == current_user.id
    is_admin = current_user.role == UserRole.ADMIN
    if not (is_author or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this comment.")
        
    now = datetime.utcnow()
    await db.comments.update_one(
        {"_id": c_obj_id},
        {"$set": {"is_deleted": True, "updated_at": now}}
    )
    
    # Decrement comment count on post
    await db.posts.update_one(
        {"_id": post_obj_id},
        {"$inc": {"comment_count": -1}, "$set": {"updated_at": now}}
    )
    
    updated = await db.comments.find_one({"_id": c_obj_id})
    return serialize_comment(updated)

@router.get("/api/admin/comments", response_model=List[CommentResponse])
async def list_admin_moderation_comments(
    current_admin: UserInDB = Depends(require_admin)
):
    """Admin-only list of all recent comments for moderation."""
    db = get_database()
    cursor = db.comments.find().sort("created_at", -1).limit(100)
    comments = await cursor.to_list(length=100)
    return [serialize_comment(c) for c in comments]
