import React from "react";
import { Link } from "react-router-dom";
import { Post, useVoteMutation } from "@/hooks/use-posts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronUpIcon, MessageSquareIcon } from "lucide-react";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const voteMutation = useVoteMutation();

  const getStatusBadge = (status: Post["status"]) => {
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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="group relative flex flex-col sm:flex-row items-start gap-4 p-4 sm:p-5 transition-all hover:border-primary/40 hover:shadow-md/5">
      {/* Upvote Button (Atomic toggle with optimistic UI) */}
      <div className="flex sm:flex-col items-center">
        <Button
          variant={post.has_voted ? "default" : "outline"}
          size="sm"
          disabled={voteMutation.isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            voteMutation.mutate(post.id);
          }}
          className={`h-14 w-12 flex-col gap-0.5 rounded-xl border transition-all ${
            post.has_voted
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              : "hover:border-primary/50 hover:bg-accent/40"
          }`}
          aria-label={post.has_voted ? "Remove upvote" : "Upvote"}
        >
          <ChevronUpIcon className={`h-5 w-5 transition-transform ${post.has_voted ? "translate-y-[-1px]" : ""}`} />
          <span className="text-xs font-bold">{post.vote_count}</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          {getStatusBadge(post.status)}
          <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
            {post.category}
          </Badge>
        </div>

        <Link to={`/posts/${post.id}`} className="block group-hover:text-primary transition-colors">
          <h3 className="text-base font-semibold leading-snug text-foreground group-hover:underline">
            {post.title}
          </h3>
        </Link>

        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {post.description.replace(/[#*_`]/g, "")}
        </p>

        {/* Footer info */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5 border border-border/60">
              <AvatarImage src={post.author?.avatar_url} alt={post.author?.name} />
              <AvatarFallback className="text-[9px]">
                {post.author?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground/80 truncate max-w-[120px]">
              {post.author?.name}
            </span>
            <span>•</span>
            <span>{formatDate(post.created_at)}</span>
          </div>

          <Link
            to={`/posts/${post.id}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <MessageSquareIcon className="h-3.5 w-3.5" />
            <span>{post.comment_count}</span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
