import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { usePosts, useUpdatePostStatusMutation } from "@/hooks/use-posts";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import {
  ShieldAlertIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  FlameIcon,
  LayersIcon,
  Trash2Icon,
  ExternalLinkIcon,
  MessageSquareIcon,
} from "lucide-react";
import { notify } from "@/lib/notify";

export function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");

  const { data: postsData, isLoading: postsLoading } = usePosts({ limit: 50 });
  const updatePostStatus = useUpdatePostStatusMutation();

  // Query recent moderation comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      return await api.get<any[]>("/api/admin/comments");
    },
    enabled: user?.role === "admin",
  });

  const softDeleteComment = useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      return await api.delete(`/api/posts/${postId}/comments/${commentId}`);
    },
    onSuccess: () => {
      notify.success("Comment Moderated", "Comment has been marked as deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
    },
    onError: (err: any) => {
      notify.error("Moderation failed", err.message);
    },
  });

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted-foreground">
        Checking permissions...
      </div>
    );
  }

  // Access Denied Alert
  if (!user || user.role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Alert variant="destructive" className="p-6">
          <div className="flex items-start gap-3">
            <ShieldAlertIcon className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <AlertTitle className="text-base font-bold">Access Denied</AlertTitle>
              <AlertDescription className="mt-1 text-sm text-muted-foreground">
                You do not have administrator permissions to access this control panel. If you
                are an administrator, please sign in with your administrative credentials.
              </AlertDescription>
              <div className="mt-4 flex gap-3">
                <Link to="/login">
                  <Button size="sm" variant="outline">
                    Sign in with Admin Account
                  </Button>
                </Link>
                <Link to="/">
                  <Button size="sm" variant="ghost">
                    Return to Feed
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  const posts = postsData?.items || [];
  const totalPosts = postsData?.total || posts.length;
  const underReviewCount = posts.filter((p) => p.status === "Under Review").length;
  const plannedCount = posts.filter((p) => p.status === "Planned").length;
  const inProgressCount = posts.filter((p) => p.status === "In Progress").length;
  const completedCount = posts.filter((p) => p.status === "Completed").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Admin Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-6 w-6 text-warning" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Administrator Control Panel
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage feature request lifecycle, transition statuses, and moderate community discussions.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/60">
          <Button
            variant={activeTab === "posts" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("posts")}
            className="text-xs h-8"
          >
            Posts ({totalPosts})
          </Button>
          <Button
            variant={activeTab === "comments" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("comments")}
            className="text-xs h-8"
          >
            Comments Moderation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-secondary/80 text-foreground">
            <LayersIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase">Under Review</p>
            <p className="text-xl font-bold">{underReviewCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <ClockIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase">Planned</p>
            <p className="text-xl font-bold">{plannedCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <FlameIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase">In Progress</p>
            <p className="text-xl font-bold">{inProgressCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircleIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase">Completed</p>
            <p className="text-xl font-bold">{completedCount}</p>
          </div>
        </Card>
      </div>

      {activeTab === "posts" ? (
        /* Posts Table */
        <Card className="overflow-hidden border border-border/80 shadow-xs">
          <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Feature Request Status Flow</h2>
            <span className="text-xs text-muted-foreground">
              Under Review → Planned → In Progress → Completed
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead className="w-[200px]">Status (Select to change)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No posts found.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id} className="hover:bg-accent/30">
                    <TableCell className="font-semibold text-foreground">
                      <Link
                        to={`/posts/${post.id}`}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        {post.title}
                        <ExternalLinkIcon className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {post.category}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {post.author?.name}
                    </TableCell>

                    <TableCell className="font-bold text-xs">
                      {post.vote_count}
                    </TableCell>

                    <TableCell>
                      <Select
                        value={post.status}
                        onValueChange={(newStatus) => {
                          if (newStatus && newStatus !== post.status) {
                            updatePostStatus.mutate({
                              postId: post.id,
                              status: newStatus as string,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Planned">Planned</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectPopup>
                      </Select>
                    </TableCell>

                    <TableCell className="text-right">
                      <Link to={`/posts/${post.id}`}>
                        <Button variant="ghost" size="xs">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Comments Moderation Table */
        <Card className="overflow-hidden border border-border/80 shadow-xs">
          <div className="p-4 border-b border-border/60 bg-muted/20">
            <h2 className="text-sm font-bold text-foreground">Recent Community Comments</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Soft-delete spam or inappropriate discussions without breaking threaded replies.
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Comment Text</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Moderation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commentsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading comments...
                  </TableCell>
                </TableRow>
              ) : comments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No comments to moderate.
                  </TableCell>
                </TableRow>
              ) : (
                comments.map((comment) => (
                  <TableRow key={comment.id} className="hover:bg-accent/30">
                    <TableCell className="max-w-md">
                      <p className="text-xs text-foreground truncate">{comment.text}</p>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {comment.author?.name}
                    </TableCell>

                    <TableCell className="text-[11px] text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>

                    <TableCell>
                      {comment.is_deleted ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Deleted
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          Active
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {!comment.is_deleted && (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-destructive hover:bg-destructive/10 gap-1"
                          onClick={() =>
                            softDeleteComment.mutate({
                              postId: comment.post_id,
                              commentId: comment.id,
                            })
                          }
                          disabled={softDeleteComment.isPending}
                        >
                          <Trash2Icon className="h-3 w-3" />
                          Soft Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
