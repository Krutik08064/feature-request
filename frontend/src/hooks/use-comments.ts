import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";

export interface CommentAuthor {
  id: string;
  name: string;
  avatar_url?: string;
  role: string;
}

export interface CommentItem {
  id: string;
  post_id: string;
  author: CommentAuthor;
  text: string;
  parent_comment_id?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string | null;
  replies: CommentItem[];
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      if (!postId) return [];
      return await api.get<CommentItem[]>(`/api/posts/${postId}/comments`);
    },
    enabled: Boolean(postId),
  });
}

export function useCreateCommentMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      text,
      parent_comment_id,
    }: {
      text: string;
      parent_comment_id?: string;
    }) => {
      return await api.post<CommentItem>(`/api/posts/${postId}/comments`, {
        text,
        parent_comment_id,
      });
    },
    onSuccess: () => {
      notify.success("Comment Posted", "Your thoughts have been added to the discussion.");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err: any) => {
      notify.error("Failed to post comment", err.message);
    },
  });
}

export function useUpdateCommentMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      text,
    }: {
      commentId: string;
      text: string;
    }) => {
      return await api.patch<CommentItem>(`/api/posts/${postId}/comments/${commentId}`, {
        text,
      });
    },
    onSuccess: () => {
      notify.success("Comment Updated", "Your edit has been saved.");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
    onError: (err: any) => {
      notify.error("Failed to update comment", err.message);
    },
  });
}

export function useDeleteCommentMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      return await api.delete<CommentItem>(`/api/posts/${postId}/comments/${commentId}`);
    },
    onSuccess: () => {
      notify.info("Comment Deleted", "The comment was marked as deleted.");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err: any) => {
      notify.error("Failed to delete comment", err.message);
    },
  });
}
