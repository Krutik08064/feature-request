import React from "react";
import { useParams, Link } from "react-router-dom";
import { usePost, useVoteMutation, useUpdatePostStatusMutation } from "@/hooks/use-posts";
import { useAuth } from "@/lib/auth-context";
import { ThreadedComments } from "@/components/ThreadedComments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import {
  ChevronUpIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from "lucide-react";

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: post, isLoading, isError } = usePost(id);
  const voteMutation = useVoteMutation();
  const updateStatus = useUpdatePostStatusMutation();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Skeleton className="h-6 w-24 mb-6 rounded" />
        <Card className="p-8 space-y-4">
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/4 rounded" />
          <Skeleton className="h-32 w-full rounded" />
        </Card>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold">Feature Request Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This post may have been removed or does not exist.
        </p>
        <Link to="/">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Feed
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Planned":
        return <Badge variant="info">Planned</Badge>;
      case "In Progress":
        return <Badge variant="warning">In Progress</Badge>;
      case "Completed":
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="secondary">Under Review</Badge>;
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to all requests
        </Link>
      </div>

      {/* Main Post Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Large Upvote Button */}
          <Button
            variant={post.has_voted ? "default" : "outline"}
            disabled={voteMutation.isPending}
            onClick={() => voteMutation.mutate(post.id)}
            className={`h-20 w-16 shrink-0 flex-col gap-1 rounded-2xl border transition-all ${
              post.has_voted
                ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                : "hover:border-primary/50 hover:bg-accent/40"
            }`}
          >
            <ChevronUpIcon
              className={`h-6 w-6 transition-transform ${
                post.has_voted ? "translate-y-[-1px]" : ""
              }`}
            />
            <span className="text-sm font-extrabold">{post.vote_count}</span>
          </Button>

          {/* Details */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                {getStatusBadge(post.status)}
                <Badge variant="outline" className="text-xs">
                  {post.category}
                </Badge>
              </div>

              {/* Admin status changer quick action */}
              {user?.role === "admin" && (
                <div className="flex items-center gap-2 bg-accent/40 rounded-lg px-2.5 py-1 border border-border/40">
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-warning" />
                  <span className="text-[11px] font-medium text-muted-foreground">Admin Status:</span>
                  <Select
                    value={post.status}
                    onValueChange={(newStatus) => {
                      if (newStatus && newStatus !== post.status) {
                        updateStatus.mutate({ postId: post.id, status: newStatus as string });
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs px-2 min-w-28 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      <SelectItem value="Under Review">Under Review</SelectItem>
                      <SelectItem value="Planned">Planned</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectPopup>
                  </Select>
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {post.title}
            </h1>

            {/* Author meta */}
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border border-border">
                  <AvatarImage src={post.author?.avatar_url} alt={post.author?.name} />
                  <AvatarFallback className="text-[10px]">
                    {post.author?.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground">{post.author?.name}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{formatDate(post.created_at)}</span>
              </div>
            </div>

            {/* Markdown Description */}
            <div className="mt-5 prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground/90 leading-relaxed">
              <ReactMarkdown>{post.description}</ReactMarkdown>
            </div>
          </div>
        </div>
      </Card>

      {/* Threaded Discussions Section */}
      <ThreadedComments postId={post.id} />
    </div>
  );
}
