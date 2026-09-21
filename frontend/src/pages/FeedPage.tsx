import React, { useState, useEffect } from "react";
import { usePosts } from "@/hooks/use-posts";
import { PostCard } from "@/components/PostCard";
import { NewPostDialog } from "@/components/NewPostDialog";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import {
  SearchIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  InboxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

export function FeedPage() {
  const { user, openAuthModal } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"top" | "newest" | "discussed">("top");
  const [page, setPage] = useState(1);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);

  // 300ms Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, isError } = usePosts({
    search: debouncedSearch,
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
    sort,
    page,
    limit: 10,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            Feature Requests
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Community Board
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suggest ideas, vote on requests you need most, and track their development progress.
          </p>
        </div>

        <Button
          onClick={() => {
            if (!user) {
              openAuthModal("Sign in to submit a new feature request");
            } else {
              setIsNewPostOpen(true);
            }
          }}
          className="gap-2 shadow-sm font-medium self-start md:self-auto"
        >
          <PlusIcon className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="space-y-4 mb-6">
        {/* Category Tabs */}
        <div className="overflow-x-auto pb-1">
          <Tabs
            value={category}
            onValueChange={(val) => {
              if (val) {
                setCategory(val as string);
                setPage(1);
              }
            }}
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTab value="all">All Categories</TabsTab>
              <TabsTab value="UI/UX">UI / UX</TabsTab>
              <TabsTab value="Integrations">Integrations</TabsTab>
              <TabsTab value="Performance">Performance</TabsTab>
              <TabsTab value="General">General</TabsTab>
            </TabsList>
          </Tabs>
        </div>

        {/* Search, Status, and Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input (Debounced 300ms) */}
          <div className="relative flex-1 w-full">
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feature requests by title or description..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Status Filter */}
            <div className="w-1/2 sm:w-40">
              <Select
                value={status}
                onValueChange={(val) => {
                  if (val) {
                    setStatus(val as string);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectPopup>
              </Select>
            </div>

            {/* Sort Select */}
            <div className="w-1/2 sm:w-40">
              <Select
                value={sort}
                onValueChange={(val) => {
                  if (val) {
                    setSort(val as "top" | "newest" | "discussed");
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="top">Most Upvoted</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="discussed">Most Discussed</SelectItem>
                </SelectPopup>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-5 rounded-xl border border-border/40 bg-card/40">
              <Skeleton className="h-14 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4 rounded" />
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
              </div>
            </div>
          ))
        ) : isError ? (
          <div className="p-8 text-center text-sm text-destructive rounded-xl border border-destructive/20 bg-destructive/5">
            Failed to load feature requests. Please try again.
          </div>
        ) : data?.items && data.items.length > 0 ? (
          <>
            {data.items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {/* Pagination Controls */}
            {data.pages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-4">
                <span className="text-xs text-muted-foreground">
                  Showing Page <strong className="text-foreground">{data.page}</strong> of{" "}
                  <strong className="text-foreground">{data.pages}</strong> ({data.total} requests)
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeftIcon className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 gap-1 text-xs"
                  >
                    Next
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Empty className="border border-dashed border-border/80 rounded-2xl">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon className="h-5 w-5 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle className="text-lg font-bold">No feature requests found</EmptyTitle>
              <EmptyDescription className="text-xs text-muted-foreground max-w-sm">
                {debouncedSearch
                  ? `No suggestions matched "${debouncedSearch}". Try another keyword or submit this request!`
                  : "Be the first to propose a suggestion for this category!"}
              </EmptyDescription>
            </EmptyHeader>
            <Button
              size="sm"
              onClick={() => {
                if (!user) {
                  openAuthModal("Sign in to submit a request");
                } else {
                  setIsNewPostOpen(true);
                }
              }}
              className="gap-1.5 font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              Create Request
            </Button>
          </Empty>
        )}
      </div>

      {/* New Post Modal Dialog */}
      <NewPostDialog open={isNewPostOpen} onOpenChange={setIsNewPostOpen} />
    </div>
  );
}
