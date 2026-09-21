import React, { useState } from "react";
import {
  CommentItem,
  useComments,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from "@/hooks/use-comments";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
} from "@/components/ui/menu";
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from "@/components/ui/collapsible";
import ReactMarkdown from "react-markdown";
import {
  MessageSquareIcon,
  ReplyIcon,
  MoreVerticalIcon,
  Edit2Icon,
  Trash2Icon,
  SendIcon,
  ChevronDownIcon,
} from "lucide-react";

interface ThreadedCommentsProps {
  postId: string;
}

export function ThreadedComments({ postId }: ThreadedCommentsProps) {
  const { user, openAuthModal } = useAuth();
  const { data: comments = [], isLoading } = useComments(postId);
  const createComment = useCreateCommentMutation(postId);
  const updateComment = useUpdateCommentMutation(postId);
  const deleteComment = useDeleteCommentMutation(postId);

  const [newCommentText, setNewCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const handlePostRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("Sign in to post a comment");
      return;
    }
    if (!newCommentText.trim()) return;

    await createComment.mutateAsync({ text: newCommentText.trim() });
    setNewCommentText("");
  };

  const handlePostReply = async (parentId: string) => {
    if (!user) {
      openAuthModal("Sign in to reply to comments");
      return;
    }
    if (!replyText.trim()) return;

    await createComment.mutateAsync({
      text: replyText.trim(),
      parent_comment_id: parentId,
    });
    setReplyText("");
    setReplyingToId(null);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    await updateComment.mutateAsync({
      commentId,
      text: editText.trim(),
    });
    setEditingId(null);
    setEditText("");
  };

  const confirmDelete = async () => {
    if (commentToDelete) {
      await deleteComment.mutateAsync(commentToDelete);
      setCommentToDelete(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderComment = (item: CommentItem, isReply = false) => {
    const isAuthor = user?.id === item.author?.id;
    const isAdmin = user?.role === "admin";
    const canManage = !item.is_deleted && (isAuthor || isAdmin);

    return (
      <div
        key={item.id}
        className={`relative ${
          isReply ? "mt-3 ml-6 sm:ml-10 pl-3 border-l-2 border-border/60" : "mt-4"
        }`}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-7 w-7 shrink-0 border border-border">
            <AvatarImage src={item.author?.avatar_url} alt={item.author?.name} />
            <AvatarFallback className="text-[10px] bg-muted">
              {item.author?.name?.slice(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {item.author?.name}
                </span>
                {item.author?.role === "admin" && (
                  <Badge variant="warning" className="text-[9px] px-1 py-0 h-4">
                    Admin
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(item.created_at)}
                </span>
              </div>

              {canManage && (
                <Menu>
                  <MenuTrigger className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground">
                    <MoreVerticalIcon className="h-3.5 w-3.5" />
                  </MenuTrigger>
                  <MenuPopup align="end" className="w-32 p-1">
                    {isAuthor && (
                      <MenuItem
                        onClick={() => {
                          setEditingId(item.id);
                          setEditText(item.text);
                        }}
                        className="gap-1.5 text-xs cursor-pointer"
                      >
                        <Edit2Icon className="h-3 w-3" />
                        Edit
                      </MenuItem>
                    )}
                    <MenuItem
                      onClick={() => setCommentToDelete(item.id)}
                      className="gap-1.5 text-xs text-destructive cursor-pointer"
                    >
                      <Trash2Icon className="h-3 w-3" />
                      Delete
                    </MenuItem>
                  </MenuPopup>
                </Menu>
              )}
            </div>

            {/* Body */}
            {editingId === item.id ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[70px] text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    onClick={() => handleSaveEdit(item.id)}
                    disabled={updateComment.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={`mt-1 text-xs text-foreground leading-relaxed ${
                  item.is_deleted ? "italic text-muted-foreground" : "prose prose-xs dark:prose-invert"
                }`}
              >
                {item.is_deleted ? (
                  item.text
                ) : (
                  <ReactMarkdown>{item.text}</ReactMarkdown>
                )}
              </div>
            )}

            {/* Reply action (allowed on root comments only for 1-level threading) */}
            {!isReply && !item.is_deleted && (
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!user) {
                      openAuthModal("Sign in to reply");
                    } else {
                      setReplyingToId(replyingToId === item.id ? null : item.id);
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <ReplyIcon className="h-3 w-3" />
                  Reply
                </button>
              </div>
            )}

            {/* Reply Input Box */}
            {replyingToId === item.id && (
              <div className="mt-3 flex items-start gap-2 pl-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Replying to ${item.author?.name}...`}
                  className="min-h-[60px] text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => handlePostReply(item.id)}
                  disabled={createComment.isPending}
                  className="h-9 px-3 gap-1 shrink-0"
                >
                  <SendIcon className="h-3.5 w-3.5" />
                  Reply
                </Button>
              </div>
            )}

            {/* Nested Replies */}
            {item.replies && item.replies.length > 0 && (
              <Collapsible defaultOpen={true} className="mt-2">
                <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer mb-1">
                  <ChevronDownIcon className="h-3 w-3 transition-transform in-data-open:rotate-180" />
                  <span>
                    {item.replies.length} {item.replies.length === 1 ? "reply" : "replies"}
                  </span>
                </CollapsibleTrigger>
                <CollapsiblePanel>
                  <div className="space-y-2">
                    {item.replies.map((reply) => renderComment(reply, true))}
                  </div>
                </CollapsiblePanel>
              </Collapsible>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-5 sm:p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareIcon className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold">Discussion</h3>
        <Badge variant="secondary" className="text-xs">
          {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}
        </Badge>
      </div>

      {/* Root Comment Box */}
      <form onSubmit={handlePostRootComment} className="space-y-2 mb-6">
        <Textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder={
            user
              ? "Share your thoughts or feedback (Markdown supported)..."
              : "Sign in to leave a comment..."
          }
          className="min-h-[80px] text-xs sm:text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Markdown supported</span>
          <Button
            type="submit"
            size="sm"
            disabled={createComment.isPending || !newCommentText.trim()}
            className="gap-1.5 font-medium"
          >
            <SendIcon className="h-3.5 w-3.5" />
            {createComment.isPending ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4 py-4">
          <div className="h-10 bg-muted/40 animate-pulse rounded-lg" />
          <div className="h-10 bg-muted/40 animate-pulse rounded-lg" />
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
          No comments yet. Start the conversation!
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {comments.map((c) => renderComment(c, false))}
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(commentToDelete)}
        onOpenChange={(open) => !open && setCommentToDelete(null)}
      >
        <AlertDialogPopup className="max-w-sm p-6">
          <AlertDialogHeader className="p-0 mb-3">
            <AlertDialogTitle className="text-lg font-bold">Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This comment will be marked as deleted. Replies in this thread will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter variant="bare" className="p-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommentToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={deleteComment.isPending}
            >
              {deleteComment.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </Card>
  );
}
