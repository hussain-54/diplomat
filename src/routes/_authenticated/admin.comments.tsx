import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Check,
  Flag,
  MessageSquareText,
  ShieldAlert,
  ShieldX,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  CmsStatus,
  cmsSecondaryButton,
} from "@/components/cms-ui";
import {
  blockCommenter,
  deleteComment,
  listCommentBlocks,
  listComments,
  moderateComment,
  unblockCommenter,
} from "@/lib/admin.functions";
import { requirePermissionRoute } from "@/lib/route-guards";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/comments")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "comments:moderate"),
  component: CommentsPage,
});

type CommentStatus = Database["public"]["Enums"]["comment_status"];
type ModerationTab = "pending" | "flagged" | "approved" | "spam";

const TABS: Array<{ id: ModerationTab; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "flagged", label: "Flagged" },
  { id: "approved", label: "Approved" },
  { id: "spam", label: "Spam" },
];

function matchesTab(status: CommentStatus, tab: ModerationTab) {
  if (tab === "flagged") return status === "flagged" || status === "rejected";
  return status === tab;
}

function statusTone(status: CommentStatus): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "spam":
      return "danger";
    case "flagged":
      return "info";
    case "rejected":
      return "neutral";
    default:
      return "neutral";
  }
}

function CommentsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ModerationTab>("pending");
  const comments = useQuery({ queryKey: ["cms-comments"], queryFn: listComments });
  const blocks = useQuery({ queryKey: ["comment-blocks"], queryFn: listCommentBlocks });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cms-comments"] }),
      queryClient.invalidateQueries({ queryKey: ["comment-blocks"] }),
    ]);
  };

  const moderate = useMutation({
    mutationFn: (value: { id: string; status: CommentStatus; moderation_note?: string }) =>
      moderateComment({ data: value }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteComment({ data: { id } }),
    onSuccess: invalidate,
  });
  const block = useMutation({
    mutationFn: (value: { email: string; comment_id: string }) =>
      blockCommenter({
        data: {
          email: value.email,
          comment_id: value.comment_id,
          reason: "Blocked from comment moderation",
        },
      }),
    onSuccess: invalidate,
  });
  const unblock = useMutation({
    mutationFn: (email: string) => unblockCommenter({ data: { email } }),
    onSuccess: invalidate,
  });

  const blockedEmails = useMemo(
    () => new Set((blocks.data ?? []).map((row) => row.email.toLowerCase())),
    [blocks.data],
  );

  const counts = useMemo(() => {
    const result: Record<ModerationTab, number> = {
      pending: 0,
      flagged: 0,
      approved: 0,
      spam: 0,
    };
    for (const comment of comments.data ?? []) {
      if (comment.status === "pending") result.pending += 1;
      else if (comment.status === "approved") result.approved += 1;
      else if (comment.status === "spam") result.spam += 1;
      else if (comment.status === "flagged" || comment.status === "rejected") result.flagged += 1;
    }
    return result;
  }, [comments.data]);

  const list = (comments.data ?? []).filter((comment) => matchesTab(comment.status, tab));
  const error =
    comments.error ?? blocks.error ?? moderate.error ?? remove.error ?? block.error ?? unblock.error;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Audience moderation"
        title="Comment Moderation"
        description="Review pending comments, flag risky posts, and block abusive commenters. Spam and profanity are auto-detected on submit."
      />

      {error && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {error.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`h-9 border px-4 text-xs font-semibold uppercase tracking-wide ${
              tab === item.id
                ? "border-foreground bg-foreground text-background"
                : "border-input bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
            <span className="ml-2 opacity-70">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <CmsPanel title={`${TABS.find((item) => item.id === tab)?.label} queue`} description={`${list.length} comments`}>
        {comments.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading comments…</div>
        ) : !list.length ? (
          <CmsEmptyState
            title="Queue is clear"
            description="There are no comments in this moderation tab."
          />
        ) : (
          <div className="divide-y divide-border">
            {list.map((comment) => {
              const flags = Array.isArray(comment.auto_flags) ? comment.auto_flags : [];
              const isBlocked = blockedEmails.has(comment.author_email.toLowerCase());
              return (
                <article key={comment.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center bg-muted">
                        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{comment.author_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {comment.author_email} · {new Date(comment.created_at).toLocaleString()}
                          {isBlocked ? " · blocked" : ""}
                        </div>
                      </div>
                      <CmsStatus tone={statusTone(comment.status)}>{comment.status}</CmsStatus>
                      {flags.map((flag) => (
                        <CmsStatus key={flag} tone="danger">
                          {flag}
                        </CmsStatus>
                      ))}
                    </div>
                    <p className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {comment.body}
                    </p>
                    {comment.moderation_note && (
                      <p className="mt-2 text-xs text-muted-foreground">{comment.moderation_note}</p>
                    )}
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
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
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
                    {comment.status !== "rejected" && (
                      <button
                        type="button"
                        className={cmsSecondaryButton}
                        disabled={moderate.isPending}
                        onClick={() =>
                          moderate.mutate({
                            id: comment.id,
                            status: "rejected",
                            moderation_note: "Rejected by moderator",
                          })
                        }
                      >
                        <X className="h-4 w-4" /> Reject
                      </button>
                    )}
                    {comment.status !== "flagged" && (
                      <button
                        type="button"
                        className={cmsSecondaryButton}
                        disabled={moderate.isPending}
                        onClick={() =>
                          moderate.mutate({
                            id: comment.id,
                            status: "flagged",
                            moderation_note: "Flagged for review",
                          })
                        }
                      >
                        <Flag className="h-4 w-4" /> Flag
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
                    {!isBlocked ? (
                      <button
                        type="button"
                        className={cmsSecondaryButton}
                        disabled={block.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Block ${comment.author_email} from commenting and mark this as spam?`,
                            )
                          ) {
                            block.mutate({
                              email: comment.author_email,
                              comment_id: comment.id,
                            });
                          }
                        }}
                      >
                        <Ban className="h-4 w-4" /> Block User
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={cmsSecondaryButton}
                        disabled={unblock.isPending}
                        onClick={() => unblock.mutate(comment.author_email)}
                      >
                        <ShieldAlert className="h-4 w-4" /> Unblock
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center border border-input text-muted-foreground hover:border-crimson hover:text-crimson"
                      onClick={() => {
                        if (window.confirm("Permanently delete this comment?")) {
                          remove.mutate(comment.id);
                        }
                      }}
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CmsPanel>

      <CmsPanel
        title="Blocked commenters"
        description={`${blocks.data?.length ?? 0} emails blocked from submitting comments`}
      >
        {!blocks.data?.length ? (
          <CmsEmptyState
            title="No blocked emails"
            description="Use Block User on a comment to prevent future submissions from that address."
          />
        ) : (
          <div className="divide-y divide-border">
            {(blocks.data ?? []).map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{row.email}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.reason || "No reason"} · {new Date(row.created_at).toLocaleString()}
                    {row.profiles?.name ? ` · by ${row.profiles.name}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className={cmsSecondaryButton}
                  disabled={unblock.isPending}
                  onClick={() => unblock.mutate(row.email)}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </CmsPanel>
    </div>
  );
}
