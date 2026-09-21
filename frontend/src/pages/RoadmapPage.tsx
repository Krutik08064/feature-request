import React from "react";
import { Link } from "react-router-dom";
import { useRoadmapPosts, useVoteMutation, Post } from "@/hooks/use-posts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronUpIcon,
  MessageSquareIcon,
  ClockIcon,
  FlameIcon,
  CheckCircle2Icon,
  LayersIcon,
} from "lucide-react";

export function RoadmapPage() {
  const { data, isLoading, isError } = useRoadmapPosts();
  const voteMutation = useVoteMutation();

  const columns = [
    {
      id: "planned",
      title: "Planned",
      subtitle: "Prioritized for future release",
      icon: ClockIcon,
      badgeVariant: "info" as const,
      posts: data?.planned || [],
      borderAccent: "border-t-blue-500",
    },
    {
      id: "inProgress",
      title: "In Progress",
      subtitle: "Currently being built",
      icon: FlameIcon,
      badgeVariant: "warning" as const,
      posts: data?.inProgress || [],
      borderAccent: "border-t-amber-500",
    },
    {
      id: "completed",
      title: "Completed",
      subtitle: "Shipped & live in production",
      icon: CheckCircle2Icon,
      badgeVariant: "success" as const,
      posts: data?.completed || [],
      borderAccent: "border-t-emerald-500",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          Public Product Roadmap
          <Badge variant="secondary" className="text-xs">
            Public Board
          </Badge>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Transparent, live development updates. See what our team is actively building,
          what's slated next, and recent releases. No login required to browse.
        </p>
      </div>

      {isError && (
        <div className="mb-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm">
          Failed to load roadmap items. Please refresh the page.
        </div>
      )}

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {columns.map((col) => {
          const Icon = col.icon;
          return (
            <div
              key={col.id}
              className={`rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 shadow-xs border-t-4 ${col.borderAccent}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-foreground/80" />
                  <h2 className="text-base font-bold text-foreground">{col.title}</h2>
                </div>
                <Badge variant={col.badgeVariant} className="text-xs">
                  {col.posts.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{col.subtitle}</p>

              {/* Column Cards */}
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} className="p-4 space-y-2.5">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-5 w-4/5" />
                      <Skeleton className="h-10 w-full" />
                    </Card>
                  ))
                ) : col.posts.length > 0 ? (
                  col.posts.map((post) => (
                    <Card
                      key={post.id}
                      className="group p-4 transition-all hover:border-primary/40 hover:shadow-md/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {post.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <Link
                        to={`/posts/${post.id}`}
                        className="block mt-2 group-hover:text-primary transition-colors"
                      >
                        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">
                          {post.title}
                        </h3>
                      </Link>

                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {post.description.replace(/[#*_`]/g, "")}
                      </p>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40">
                        {/* Compact Upvote */}
                        <Button
                          variant={post.has_voted ? "default" : "outline"}
                          size="xs"
                          onClick={(e) => {
                            e.preventDefault();
                            voteMutation.mutate(post.id);
                          }}
                          className={`h-7 px-2.5 gap-1 text-xs rounded-lg ${
                            post.has_voted ? "bg-primary text-primary-foreground" : ""
                          }`}
                        >
                          <ChevronUpIcon className="h-3.5 w-3.5" />
                          <span className="font-bold">{post.vote_count}</span>
                        </Button>

                        <Link
                          to={`/posts/${post.id}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MessageSquareIcon className="h-3.5 w-3.5" />
                          <span>{post.comment_count}</span>
                        </Link>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                    <LayersIcon className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1.5" />
                    No requests in this stage yet.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
