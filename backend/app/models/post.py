from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class PostCategory(str, Enum):
    UI_UX = "UI/UX"
    INTEGRATIONS = "Integrations"
    PERFORMANCE = "Performance"
    GENERAL = "General"

class PostStatus(str, Enum):
    UNDER_REVIEW = "Under Review"
    PLANNED = "Planned"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"

class PostSort(str, Enum):
    TOP = "top"
    NEWEST = "newest"
    DISCUSSED = "discussed"

class PostCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=5, max_length=5000)
    category: PostCategory

class PostUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    description: Optional[str] = Field(None, min_length=5, max_length=5000)
    category: Optional[PostCategory] = None

class PostStatusUpdateRequest(BaseModel):
    status: PostStatus

class PostAuthor(BaseModel):
    id: str
    name: str
    avatar_url: Optional[str] = None

class PostResponse(BaseModel):
    id: str
    title: str
    description: str
    category: PostCategory
    status: PostStatus
    author: PostAuthor
    vote_count: int = 0
    comment_count: int = 0
    has_voted: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PostListResponse(BaseModel):
    items: List[PostResponse]
    total: int
    page: int
    limit: int
    pages: int
