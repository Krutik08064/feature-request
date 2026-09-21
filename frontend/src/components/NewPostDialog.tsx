import React, { useState } from "react";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import { useCreatePostMutation } from "@/hooks/use-posts";
import ReactMarkdown from "react-markdown";
import { SparklesIcon, EyeIcon, Edit3Icon } from "lucide-react";

interface NewPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPostDialog({ open, onOpenChange }: NewPostDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("UI/UX");
  const [description, setDescription] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCreatePostMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 3) {
      setError("Title must be at least 3 characters long.");
      return;
    }

    if (description.trim().length < 5) {
      setError("Please provide a more detailed description (at least 5 characters).");
      return;
    }

    try {
      await createPost.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category,
      });
      // Reset & close
      setTitle("");
      setDescription("");
      setCategory("UI/UX");
      setIsPreview(false);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-xl p-6">
        <DialogHeader className="p-0 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SparklesIcon className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">New Feature Request</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Suggest an idea or enhancement for the community and roadmap.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-xs text-destructive font-medium border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Title</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Export roadmap data to CSV and JSON"
              className="text-sm font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Category</Label>
            <Select value={category} onValueChange={(val) => val && setCategory(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="UI/UX">UI / UX</SelectItem>
                <SelectItem value="Integrations">Integrations</SelectItem>
                <SelectItem value="Performance">Performance</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectPopup>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Description (Markdown Supported)</Label>
              <button
                type="button"
                onClick={() => setIsPreview(!isPreview)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isPreview ? (
                  <>
                    <Edit3Icon className="h-3 w-3" />
                    Write
                  </>
                ) : (
                  <>
                    <EyeIcon className="h-3 w-3" />
                    Preview
                  </>
                )}
              </button>
            </div>

            {isPreview ? (
              <div className="min-h-[140px] max-h-[220px] overflow-y-auto rounded-lg border border-input bg-muted/20 p-3 text-sm prose prose-neutral dark:prose-invert">
                {description.trim() ? (
                  <ReactMarkdown>{description}</ReactMarkdown>
                ) : (
                  <span className="text-muted-foreground italic text-xs">Nothing to preview yet.</span>
                )}
              </div>
            ) : (
              <Textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem, use case, or expected outcome..."
                className="min-h-[140px] text-sm"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createPost.isPending}
              className="font-medium"
            >
              {createPost.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
