import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/notify";

export interface PostAuthor {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface Post {
  id: string;
  title: string;
  description: string;
  category: "UI/UX" | "Integrations" | "Performance" | "General";
  status: "Under Review" | "Planned" | "In Progress" | "Completed";
  author: PostAuthor;
  vote_count: number;
  comment_count: number;
  has_voted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostListResponse {
  items: Post[];
  total: int;
  page: number;
  limit: number;
  pages: number;
}

export interface PostsQueryParams {
  category?: string;
  status?: string;
  search?: string;
  sort?: "top" | "newest" | "discussed";
  page?: number;
  limit?: number;
}

export function usePosts(params: PostsQueryParams = {}) {
  const { user } = useAuth();
  const queryKey = ["posts", params, user?.id];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.category && params.category !== "all") sp.append("category", params.category);
      if (params.status && params.status !== "all") sp.append("status", params.status);
      if (params.search) sp.append("search", params.search);
      if (params.sort) sp.append("sort", params.sort);
      if (params.page) sp.append("page", String(params.page));
      if (params.limit) sp.append("limit", String(params.limit));

      const queryStr = sp.toString();
      const endpoint = queryStr ? `/api/posts?${queryStr}` : "/api/posts";
      return await api.get<PostListResponse>(endpoint);
    },
  });
}

export function usePost(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["post", id, user?.id],
    queryFn: async () => {
      if (!id) throw new Error("Missing post ID");
      return await api.get<Post>(`/api/posts/${id}`);
    },
    enabled: Boolean(id),
  });
}

export function useRoadmapPosts() {
  return useQuery({
    queryKey: ["roadmap-posts"],
    queryFn: async () => {
      const res = await api.get<PostListResponse>("/api/posts?limit=100");
      const planned = res.items.filter((p) => p.status === "Planned");
      const inProgress = res.items.filter((p) => p.status === "In Progress");
      const completed = res.items.filter((p) => p.status === "Completed");
      return { planned, inProgress, completed };
    },
  });
}

export function useVoteMutation() {
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) {
        openAuthModal("Sign in to upvote this feature request");
        throw new ApiError(401, "Sign in to upvote");
      }
      return await api.patch<Post>(`/api/posts/${postId}/vote`);
    },
    onMutate: async (postId: string) => {
      if (!user) return;
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["post", postId] });

      const previousPost = queryClient.getQueryData<Post>(["post", postId, user.id]);

      // Optimistically update single post if in cache
      if (previousPost) {
        const nextHasVoted = !previousPost.has_voted;
        const nextVoteCount = nextHasVoted
          ? previousPost.vote_count + 1
          : Math.max(0, previousPost.vote_count - 1);

        queryClient.setQueryData<Post>(["post", postId, user.id], {
          ...previousPost,
          has_voted: nextHasVoted,
          vote_count: nextVoteCount,
        });
      }

      return { previousPost };
    },
    onError: (err: any, postId, context) => {
      if (err?.status === 401) return;
      // Rollback on error
      if (context?.previousPost && user) {
        queryClient.setQueryData(["post", postId, user.id], context.previousPost);
      }
      notify.error("Voting failed", err.message);
    },
    onSuccess: (updatedPost) => {
      notify.success(
        updatedPost.has_voted ? "Upvoted!" : "Upvote removed",
        updatedPost.has_voted ? "Thanks for your feedback!" : "Vote canceled"
      );
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", updatedPost.id] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-posts"] });
    },
  });
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; description: string; category: string }) => {
      return await api.post<Post>("/api/posts", data);
    },
    onSuccess: (newPost) => {
      notify.success("Request Submitted", `"${newPost.title}" is now Under Review.`);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err: any) => {
      notify.error("Failed to create request", err.message);
    },
  });
}

export function useUpdatePostStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, status }: { postId: string; status: string }) => {
      return await api.patch<Post>(`/api/posts/${postId}/status`, { status });
    },
    onSuccess: (updatedPost) => {
      notify.success("Status Updated", `Moved to ${updatedPost.status}`);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", updatedPost.id] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-posts"] });
    },
    onError: (err: any) => {
      notify.error("Failed to update status", err.message);
    },
  });
}
