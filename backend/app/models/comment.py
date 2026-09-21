from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class CommentAuthor(BaseModel):
    id: str
    name: str
    avatar_url: Optional[str] = None
    role: str = "user"

class CommentCreateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    parent_comment_id: Optional[str] = None

class CommentUpdateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)

class CommentResponse(BaseModel):
    id: str
    post_id: str
    author: CommentAuthor
    text: str
    parent_comment_id: Optional[str] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    replies: List["CommentResponse"] = []

    model_config = ConfigDict(from_attributes=True)
