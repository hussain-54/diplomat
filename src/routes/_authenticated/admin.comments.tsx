import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MessageSquareText, ShieldX, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  CmsStatus,
  cmsSecondaryButton,
} from "@/components/cms-ui";
import { deleteComment, listComments, moderateComment } from "@/lib/admin.functions";
import { requireEditorRoute } from "@/lib/route-guards";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/comments")({
  beforeLoad: ({ context }) => requireEditorRoute(context.roles),
  component: CommentsPage,
});

type CommentStatus = Database["public"]["Enums"]["comment_status"];

function CommentsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<CommentStatus | "all">("pending");
  const comments = useQuery({ queryKey: ["cms-comments"], queryFn: listComments });
  const moderate = useMutation({
    mutationFn: (value: { id: string; status: CommentStatus }) => moderateComment({ data: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cms-comments"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteComment({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cms-comments"] }),
  });
  const list = (comments.data ?? []).filter((comment) => filter === "all" || comment.status === filter);
  const counts = (comments.data ?? []).reduce<Record<CommentStatus, number>>(
    (result, comment) => ({ ...result, [comment.status]: result[comment.status] + 1 }),
    { pending: 0, approved: 0, rejected: 0, spam: 0 },
  );
  const error = comments.error ?? moderate.error ?? remove.error;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Audience moderation"
        title="Comments"
        description="Review audience contributions before they appear on published stories."
      />

      {error && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {error.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "spam", "all"] as const).map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => setFilter(status)}
            className={`h-9 border px-3 text-xs font-semibold capitalize ${
              filter === status
                ? "border-foreground bg-foreground text-background"
                : "border-input bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {status} {status === "all" ? comments.data?.length ?? 0 : counts[status]}
          </button>
        ))}
      </div>

      <CmsPanel title="Moderation queue" description={`${list.length} comments in this view`}>
        {comments.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading comments…</div>
        ) : !list.length ? (
          <CmsEmptyState
            title="Queue is clear"
            description="There are no comments matching the selected moderation status."
          />
        ) : (
          <div className="divide-y divide-border">
            {list.map((comment) => (
              <article key={comment.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center bg-muted">
                      <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{comment.author_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {comment.author_email} · {new Date(comment.created_at).toLocaleString()}
                      </div>
                    </div>
                    <CmsStatus
                      tone={
                        comment.status === "approved"
                          ? "success"
                          : comment.status === "pending"
                            ? "warning"
                            : comment.status === "spam"
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {comment.status}
                    </CmsStatus>
                  </div>
                  <p className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.body}</p>
                  {comment.articles && (
                    <Link
                      to="/admin/articles/$id"
                      params={{ id: comment.articles.id }}
                      className="mt-3 inline-block text-xs font-semibold text-cat-blue hover:underline"
                    >
                      On: {comment.articles.title}
                    </Link>
                  )}
                </div>
                <div className="flex items-start gap-2 lg:justify-end">
                  {comment.status !== "approved" && (
                    <button
                      type="button"
                      className={cmsSecondaryButton}
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate({ id: comment.id, status: "approved" })}
                    >
                      <Check className="h-4 w-4 text-cat-green" /> Approve
                    </button>
                  )}
                  {comment.status !== "spam" && (
                    <button
                      type="button"
                      className={cmsSecondaryButton}
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate({ id: comment.id, status: "spam" })}
                    >
                      <ShieldX className="h-4 w-4" /> Spam
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center border border-input text-muted-foreground hover:border-crimson hover:text-crimson"
                    onClick={() => {
                      if (window.confirm("Permanently delete this comment?")) remove.mutate(comment.id);
                    }}
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </CmsPanel>
    </div>
  );
}
