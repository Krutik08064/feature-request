import os
import sys
from datetime import datetime, timedelta

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import certifi
from pymongo import MongoClient
from app.core.config import settings
from app.core.security import get_password_hash

def seed_data():
    print(f"Connecting to MongoDB at {settings.MONGODB_URL} (db: {settings.MONGODB_DB_NAME})...")
    kwargs = {"serverSelectionTimeoutMS": 10000}
    if "mongodb+srv://" in settings.MONGODB_URL or "ssl=true" in settings.MONGODB_URL.lower():
        kwargs["tlsCAFile"] = certifi.where()
    client = MongoClient(settings.MONGODB_URL, **kwargs)
    db = client[settings.MONGODB_DB_NAME]

    # Verify connection
    client.admin.command('ping')
    print("MongoDB connection verified.")

    # Clean existing data
    print("Clearing existing collections...")
    db.users.delete_many({})
    db.posts.delete_many({})
    db.comments.delete_many({})

    # Ensure indexes
    db.users.create_index("email", unique=True)
    db.users.create_index("role")
    db.posts.create_index([("title", "text"), ("description", "text")])
    db.posts.create_index("status")
    db.posts.create_index("category")
    db.posts.create_index("vote_count")
    db.posts.create_index("created_at")
    db.comments.create_index("post_id")
    db.comments.create_index("parent_comment_id")

    print("Creating demo users...")
    now = datetime.utcnow()
    
    # Passwords hashed with bcrypt
    admin_pw = get_password_hash("Admin123!")
    user_pw = get_password_hash("User123!")

    admin_doc = {
        "name": "Sarah Connor (Admin)",
        "email": "admin@combot.dev",
        "password_hash": admin_pw,
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=SarahAdmin",
        "role": "admin",
        "is_verified": True,
        "verification_token": None,
        "refresh_token_hash": None,
        "created_at": now - timedelta(days=30),
    }
    admin_res = db.users.insert_one(admin_doc)
    admin_id = str(admin_res.inserted_id)

    user1_doc = {
        "name": "Alex Rivera",
        "email": "alex@combot.dev",
        "password_hash": user_pw,
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=AlexRivera",
        "role": "user",
        "is_verified": True,
        "verification_token": None,
        "refresh_token_hash": None,
        "created_at": now - timedelta(days=20),
    }
    user1_res = db.users.insert_one(user1_doc)
    user1_id = str(user1_res.inserted_id)

    user2_doc = {
        "name": "Jordan Lee",
        "email": "jordan@combot.dev",
        "password_hash": user_pw,
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=JordanLee",
        "role": "user",
        "is_verified": True,
        "verification_token": None,
        "refresh_token_hash": None,
        "created_at": now - timedelta(days=15),
    }
    user2_res = db.users.insert_one(user2_doc)
    user2_id = str(user2_res.inserted_id)

    user3_doc = {
        "name": "Elena Rostova",
        "email": "elena@combot.dev",
        "password_hash": user_pw,
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=ElenaRostova",
        "role": "user",
        "is_verified": True,
        "verification_token": None,
        "refresh_token_hash": None,
        "created_at": now - timedelta(days=10),
    }
    user3_res = db.users.insert_one(user3_doc)
    user3_id = str(user3_res.inserted_id)

    print("Seeding feature requests (Posts)...")
    posts_data = [
        {
            "title": "Discord & Slack Webhook Notifications",
            "description": "It would be super helpful to receive automated alerts in Slack/Discord channels whenever a feature request status transitions or receives high upvote momentum.\n\n### Desired capabilities:\n- Webhook URL configuration in settings\n- Filter events (new request, status change to Planned/Completed)\n- Rich embed preview with link to post",
            "category": "Integrations",
            "status": "In Progress",
            "author_id": user1_id,
            "author": {"id": user1_id, "name": "Alex Rivera", "avatar_url": user1_doc["avatar_url"]},
            "upvoted_by": [user1_id, user2_id, user3_id, admin_id],
            "vote_count": 4,
            "comment_count": 2,
            "created_at": now - timedelta(days=12),
            "updated_at": now - timedelta(days=2),
        },
        {
            "title": "CSV and JSON Data Export for Product Analytics",
            "description": "We need the ability to export all public feedback, upvote records, and comments as CSV or JSON so our BI team can run cohort analysis and product prioritization reports.",
            "category": "General",
            "status": "Planned",
            "author_id": user2_id,
            "author": {"id": user2_id, "name": "Jordan Lee", "avatar_url": user2_doc["avatar_url"]},
            "upvoted_by": [user1_id, user2_id, admin_id],
            "vote_count": 3,
            "comment_count": 1,
            "created_at": now - timedelta(days=8),
            "updated_at": now - timedelta(days=4),
        },
        {
            "title": "Full Dark Mode Support with System Accent Sync",
            "description": "Please support an automatic dark mode that respects OS preferences, with smooth transitions and high-contrast accessibility compliance (WCAG 2.1 AAA).",
            "category": "UI/UX",
            "status": "Completed",
            "author_id": user3_id,
            "author": {"id": user3_id, "name": "Elena Rostova", "avatar_url": user3_doc["avatar_url"]},
            "upvoted_by": [user1_id, user2_id, user3_id],
            "vote_count": 3,
            "comment_count": 1,
            "created_at": now - timedelta(days=18),
            "updated_at": now - timedelta(days=1),
        },
        {
            "title": "SAML 2.0 / Okta Single Sign-On for Enterprise Teams",
            "description": "Enterprise customer teams require SSO integration via SAML 2.0 or OIDC with Okta/Azure AD for employee authentication rather than individual credentials.",
            "category": "Integrations",
            "status": "Planned",
            "author_id": admin_id,
            "author": {"id": admin_id, "name": "Sarah Connor (Admin)", "avatar_url": admin_doc["avatar_url"]},
            "upvoted_by": [user2_id, admin_id],
            "vote_count": 2,
            "comment_count": 0,
            "created_at": now - timedelta(days=6),
            "updated_at": now - timedelta(days=3),
        },
        {
            "title": "Virtual Scrolling & Sub-100ms Feed Loading",
            "description": "When boards scale to thousands of submissions, DOM rendering of cards can slow down. Implementing client-side virtualized rendering and edge caching will keep interactions butter-smooth.",
            "category": "Performance",
            "status": "In Progress",
            "author_id": user1_id,
            "author": {"id": user1_id, "name": "Alex Rivera", "avatar_url": user1_doc["avatar_url"]},
            "upvoted_by": [user1_id, user3_id],
            "vote_count": 2,
            "comment_count": 0,
            "created_at": now - timedelta(days=14),
            "updated_at": now - timedelta(days=5),
        },
        {
            "title": "Linear & GitHub Issues Two-Way Sync",
            "description": "Link roadmap items directly to issues in Linear or GitHub. When engineering closes an issue in GitHub, the ComBot roadmap card should automatically transition to 'Completed'.",
            "category": "Integrations",
            "status": "Under Review",
            "author_id": user2_id,
            "author": {"id": user2_id, "name": "Jordan Lee", "avatar_url": user2_doc["avatar_url"]},
            "upvoted_by": [user2_id, user3_id],
            "vote_count": 2,
            "comment_count": 0,
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(days=3),
        },
        {
            "title": "Custom Categorization & Tags Filtering",
            "description": "Allow workspace administrators to define custom tags and subcategories beyond standard UI/UX and Integrations.",
            "category": "General",
            "status": "Under Review",
            "author_id": user3_id,
            "author": {"id": user3_id, "name": "Elena Rostova", "avatar_url": user3_doc["avatar_url"]},
            "upvoted_by": [user3_id],
            "vote_count": 1,
            "comment_count": 0,
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(days=2),
        },
    ]

    inserted_posts = []
    for p in posts_data:
        res = db.posts.insert_one(p)
        p["_id"] = res.inserted_id
        inserted_posts.append(p)

    print("Seeding threaded comments...")
    post1_id = str(inserted_posts[0]["_id"])
    c1 = {
        "post_id": post1_id,
        "author_id": admin_id,
        "author": {"id": admin_id, "name": "Sarah Connor (Admin)", "avatar_url": admin_doc["avatar_url"], "role": "admin"},
        "text": "Great suggestion! The core webhook infrastructure is currently being tested on our staging cluster. We are planning to support both Slack incoming webhooks and Discord embeds.",
        "parent_comment_id": None,
        "is_deleted": False,
        "created_at": now - timedelta(days=10),
        "updated_at": None,
    }
    c1_res = db.comments.insert_one(c1)
    c1_id = str(c1_res.inserted_id)

    c2 = {
        "post_id": post1_id,
        "author_id": user1_id,
        "author": {"id": user1_id, "name": "Alex Rivera", "avatar_url": user1_doc["avatar_url"], "role": "user"},
        "text": "That's awesome news @Sarah! Will there be support for secret signature verification in headers?",
        "parent_comment_id": c1_id,
        "is_deleted": False,
        "created_at": now - timedelta(days=9),
        "updated_at": None,
    }
    db.comments.insert_one(c2)

    post2_id = str(inserted_posts[1]["_id"])
    c3 = {
        "post_id": post2_id,
        "author_id": user3_id,
        "author": {"id": user3_id, "name": "Elena Rostova", "avatar_url": user3_doc["avatar_url"], "role": "user"},
        "text": "+1 for this. Having JSON schema exports for Postgres pipeline loading would save us hours of manual ETL.",
        "parent_comment_id": None,
        "is_deleted": False,
        "created_at": now - timedelta(days=5),
        "updated_at": None,
    }
    db.comments.insert_one(c3)

    post3_id = str(inserted_posts[2]["_id"])
    c4 = {
        "post_id": post3_id,
        "author_id": admin_id,
        "author": {"id": admin_id, "name": "Sarah Connor (Admin)", "avatar_url": admin_doc["avatar_url"], "role": "admin"},
        "text": "Shipped in the latest update! Dark mode and system sync are live across all boards and roadmap views.",
        "parent_comment_id": None,
        "is_deleted": False,
        "created_at": now - timedelta(days=1),
        "updated_at": None,
    }
    db.comments.insert_one(c4)

    print("\nDatabase successfully seeded with realistic sample data!")
    print("------------------------------------------------------------")
    print("Admin credentials : admin@combot.dev / Admin123!")
    print("User credentials  : alex@combot.dev / User123!")
    print("User credentials  : jordan@combot.dev / User123!")
    print("------------------------------------------------------------\n")
    client.close()

if __name__ == "__main__":
    seed_data()
