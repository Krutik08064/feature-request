import pytest
import secrets
from httpx import AsyncClient, ASGITransport
from main import app
from app.db.mongodb import connect_to_mongo, close_mongo_connection

@pytest.fixture(autouse=True)
async def init_db():
    await connect_to_mongo()
    yield
    await close_mongo_connection()

@pytest.mark.asyncio
async def test_auth_and_voting_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test unauthenticated voting returns 401
        posts_res = await client.get("/api/posts")
        assert posts_res.status_code == 200
        data = posts_res.json()
        assert len(data["items"]) > 0
        post_id = data["items"][0]["id"]
        initial_votes = data["items"][0]["vote_count"]

        unauth_vote_res = await client.patch(f"/api/posts/{post_id}/vote")
        assert unauth_vote_res.status_code == 401
        assert "Not authenticated" in unauth_vote_res.json()["detail"]

        # 2. Signup new user
        rand_suffix = secrets.token_hex(4)
        signup_email = f"tester_{rand_suffix}@combot.dev"
        signup_res = await client.post("/api/auth/signup", json={
            "name": "Integration Tester",
            "email": signup_email,
            "password": "Password123!"
        })
        assert signup_res.status_code == 201

        # 3. Unverified login should be rejected (403)
        unverified_login_res = await client.post("/api/auth/login", json={
            "email": signup_email,
            "password": "Password123!"
        })
        assert unverified_login_res.status_code == 403

        # 4. Get dev token & verify email
        dev_res = await client.get(f"/api/auth/dev-tokens?email={signup_email}")
        assert dev_res.status_code == 200
        otp = dev_res.json()["token"]
        assert otp is not None

        verify_res = await client.post("/api/auth/verify-email", json={
            "email": signup_email,
            "token": otp
        })
        assert verify_res.status_code == 200

        # 5. Login
        login_res = await client.post("/api/auth/login", json={
            "email": signup_email,
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        assert "access_token" in login_res.cookies
        assert "refresh_token" in login_res.cookies
        user_info = login_res.json()["user"]
        assert user_info["email"] == signup_email
        assert user_info["role"] == "user"

        # 6. Verify /api/auth/me works with httpOnly cookie
        me_res = await client.get("/api/auth/me")
        assert me_res.status_code == 200
        assert me_res.json()["email"] == signup_email

        # 7. Atomic voting test (Toggle ON)
        vote_on_res = await client.patch(f"/api/posts/{post_id}/vote")
        assert vote_on_res.status_code == 200
        voted_data = vote_on_res.json()
        assert voted_data["has_voted"] is True
        assert voted_data["vote_count"] == initial_votes + 1

        # 8. Atomic voting test (Toggle OFF)
        vote_off_res = await client.patch(f"/api/posts/{post_id}/vote")
        assert vote_off_res.status_code == 200
        unvoted_data = vote_off_res.json()
        assert unvoted_data["has_voted"] is False
        assert unvoted_data["vote_count"] == initial_votes

        # 9. Non-admin hitting admin endpoint returns 403 Forbidden
        status_res = await client.patch(f"/api/posts/{post_id}/status", json={"status": "Completed"})
        assert status_res.status_code == 403
        assert "Admin privileges required" in status_res.json()["detail"]

        # 10. Threaded Comments: Create root comment and reply
        c_res = await client.post(f"/api/posts/{post_id}/comments", json={
            "text": "Top level integration test comment."
        })
        assert c_res.status_code == 201
        parent_c_id = c_res.json()["id"]

        reply_res = await client.post(f"/api/posts/{post_id}/comments", json={
            "text": "Nested reply integration test comment.",
            "parent_comment_id": parent_c_id
        })
        assert reply_res.status_code == 201
        assert reply_res.json()["parent_comment_id"] == parent_c_id

        # List comments and check threaded hierarchy
        list_c_res = await client.get(f"/api/posts/{post_id}/comments")
        assert list_c_res.status_code == 200
        thread = [c for c in list_c_res.json() if c["id"] == parent_c_id]
        assert len(thread) == 1
        assert len(thread[0]["replies"]) >= 1

        # 11. Soft-delete comment
        del_c_res = await client.delete(f"/api/posts/{post_id}/comments/{parent_c_id}")
        assert del_c_res.status_code == 200
        assert del_c_res.json()["is_deleted"] is True
        assert "[This comment has been deleted]" in del_c_res.json()["text"]

        # 12. Refresh token rotation
        refresh_res = await client.post("/api/auth/refresh")
        assert refresh_res.status_code == 200
        assert "access_token" in refresh_res.cookies
        assert "refresh_token" in refresh_res.cookies

        # 13. Logout
        logout_res = await client.post("/api/auth/logout")
        assert logout_res.status_code == 200

        # After logout, me endpoint should return 401
        after_logout_res = await client.get("/api/auth/me")
        assert after_logout_res.status_code == 401

@pytest.mark.asyncio
async def test_admin_rbac_and_roadmap():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Public roadmap loads without auth
        feed_res = await client.get("/api/posts?status=Planned")
        assert feed_res.status_code == 200

        # Login as seeded admin
        login_res = await client.post("/api/auth/login", json={
            "email": "admin@combot.dev",
            "password": "Admin123!"
        })
        assert login_res.status_code == 200
        assert login_res.json()["user"]["role"] == "admin"

        # Admin creates a post
        post_create_res = await client.post("/api/posts", json={
            "title": "Admin Created Feature Request",
            "description": "Testing admin post creation and status transitions.",
            "category": "Performance"
        })
        assert post_create_res.status_code == 201
        new_post_id = post_create_res.json()["id"]
        assert post_create_res.json()["status"] == "Under Review"

        # Admin transitions status to Planned -> In Progress -> Completed
        for target_status in ["Planned", "In Progress", "Completed"]:
            update_res = await client.patch(f"/api/posts/{new_post_id}/status", json={
                "status": target_status
            })
            assert update_res.status_code == 200
            assert update_res.json()["status"] == target_status

        # Admin comment moderation endpoint
        mod_res = await client.get("/api/admin/comments")
        assert mod_res.status_code == 200
        assert isinstance(mod_res.json(), list)
