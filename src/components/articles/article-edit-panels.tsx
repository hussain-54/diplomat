import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, MessageSquareText, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import {
  addArticleNote,
  listArticleApprovals,
  listArticleNotes,
  type ArticleApprovalAction,
  type ArticleNoteType,
} from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

const ACTION_LABEL: Record<ArticleApprovalAction, string> = {
  submit_review: "Submitted for review",
  approve: "Approved",
  reject: "Rejected",
  request_changes: "Changes requested",
  publish: "Published",
  schedule: "Scheduled",
  archive: "Archived",
};

export function ArticleNotesPanel({
  articleId,
  canEditorial,
  canFactCheck,
}: {
  articleId: string;
  canEditorial: boolean;
  canFactCheck: boolean;
}) {
  const queryClient = useQueryClient();
  const notes = useQuery({
    queryKey: ["article-notes", articleId],
    queryFn: () => listArticleNotes({ data: { article_id: articleId } }),
    enabled: Boolean(articleId) && articleId !== "new",
  });
  const [editorialDraft, setEditorialDraft] = useState("");
  const [factDraft, setFactDraft] = useState("");

  const add = useMutation({
    mutationFn: addArticleNote,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["article-notes", articleId] });
      setEditorialDraft("");
      setFactDraft("");
    },
  });

  const editorial = (notes.data ?? []).filter((note) => note.note_type === "editorial");
  const factCheck = (notes.data ?? []).filter((note) => note.note_type === "fact_check");

  return (
    <div className="space-y-4">
      <NoteSection
        title="Editorial notes"
        icon={MessageSquareText}
        notes={editorial}
        draft={editorialDraft}
        onDraftChange={setEditorialDraft}
        canWrite={canEditorial}
        pending={add.isPending}
        error={add.error?.message}
        onSubmit={() =>
          add.mutate({
            data: { article_id: articleId, note_type: "editorial", body: editorialDraft },
          })
        }
      />
      <NoteSection
        title="Fact-check notes"
        icon={ClipboardCheck}
        notes={factCheck}
        draft={factDraft}
        onDraftChange={setFactDraft}
        canWrite={canFactCheck}
        pending={add.isPending}
        error={add.error?.message}
        onSubmit={() =>
          add.mutate({
            data: { article_id: articleId, note_type: "fact_check", body: factDraft },
          })
        }
      />
    </div>
  );
}

function NoteSection({
  title,
  icon: Icon,
  notes,
  draft,
  onDraftChange,
  canWrite,
  pending,
  error,
  onSubmit,
}: {
  title: string;
  icon: typeof MessageSquareText;
  notes: Array<{
    id: string;
    body: string;
    created_at: string;
    author?: { name?: string | null } | { name?: string | null }[] | null;
  }>;
  draft: string;
  onDraftChange: (value: string) => void;
  canWrite: boolean;
  pending: boolean;
  error?: string;
  onSubmit: () => void;
}) {
  return (
    <CmsPanel title={title} description="Desk collaboration on this story">
      <div className="space-y-3 p-5">
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {!notes.length ? (
            <div className="text-xs text-muted-foreground">No notes yet.</div>
          ) : (
            notes.map((note) => {
              const author = Array.isArray(note.author) ? note.author[0]?.name : note.author?.name;
              return (
                <div key={note.id} className="border border-border bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {author ?? "Staff"} · {new Date(note.created_at).toLocaleString()}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{note.body}</p>
                </div>
              );
            })
          )}
        </div>
        {canWrite ? (
          <div className="space-y-2">
            <textarea
              className={`${cmsInput} h-auto py-2`}
              rows={3}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder={`Add ${title.toLowerCase()}…`}
            />
            <button
              type="button"
              className={cmsSecondaryButton}
              disabled={pending || !draft.trim()}
              onClick={onSubmit}
            >
              Add note
            </button>
            {error ? <div className="text-xs text-crimson">{error}</div> : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Your role cannot add these notes.</p>
        )}
      </div>
    </CmsPanel>
  );
}

export function ArticleApprovalHistoryPanel({ articleId }: { articleId: string }) {
  const approvals = useQuery({
    queryKey: ["article-approvals", articleId],
    queryFn: () => listArticleApprovals({ data: { article_id: articleId } }),
    enabled: Boolean(articleId) && articleId !== "new",
  });

  return (
    <CmsPanel
      title="Approval history"
      description="Workflow actions on this article"
      action={
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {approvals.data?.length ?? 0}
        </span>
      }
    >
      {!approvals.data?.length ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Workflow actions will appear here as the story moves through review.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {approvals.data.map((row) => {
            const actor = Array.isArray(row.actor) ? row.actor[0]?.name : row.actor?.name;
            return (
              <div key={row.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {ACTION_LABEL[row.action as ArticleApprovalAction] ?? row.action}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {actor ?? "Staff"} · {new Date(row.created_at).toLocaleString()}
                    {row.from_status && row.to_status
                      ? ` · ${row.from_status} → ${row.to_status}`
                      : null}
                  </div>
                  {row.note ? (
                    <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>
                  ) : null}
                </div>
                <CmsStatus tone={approvalTone(row.action)}>{row.action}</CmsStatus>
              </div>
            );
          })}
        </div>
      )}
    </CmsPanel>
  );
}

export function WorkflowActions({
  status,
  canSubmitReview,
  canReview,
  canPublish,
  disabled,
  dirty,
  onAction,
}: {
  status: string;
  canSubmitReview: boolean;
  canReview: boolean;
  canPublish: boolean;
  disabled?: boolean;
  dirty?: boolean;
  onAction: (action: ArticleApprovalAction, note?: string) => void;
}) {
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Publishing workflow
      </div>
      {dirty ? (
        <p className="text-[11px] text-cat-amber">
          Unsaved edits will be saved automatically before this action runs.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canSubmitReview && status === "draft" ? (
          <button
            type="button"
            className={cmsSecondaryButton}
            disabled={disabled}
            onClick={() => onAction("submit_review")}
          >
            Submit for review
          </button>
        ) : null}
        {canPublish && (status === "draft" || status === "review") ? (
          <button
            type="button"
            className={cn(cmsButton)}
            disabled={disabled}
            title="Save current content and publish live"
            onClick={() => onAction("publish")}
          >
            {status === "review" ? "Approve & publish" : "Publish now"}
          </button>
        ) : null}
        {canReview && status === "review" ? (
          <>
            <button
              type="button"
              className={cmsSecondaryButton}
              disabled={disabled}
              title="Records an approval note — status stays In review until published"
              onClick={() => onAction("approve")}
            >
              Log approval
            </button>
            <button
              type="button"
              className={cmsSecondaryButton}
              disabled={disabled}
              onClick={() => {
                const note = window.prompt("Request changes — note for the author") ?? "";
                onAction("request_changes", note || undefined);
              }}
            >
              Request changes
            </button>
            <button
              type="button"
              className={cmsSecondaryButton}
              disabled={disabled}
              onClick={() => {
                const note = window.prompt("Reject — optional note") ?? "";
                onAction("reject", note || undefined);
              }}
            >
              Reject
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function approvalTone(
  action: string,
): "neutral" | "success" | "warning" | "danger" | "info" {
  if (action === "approve" || action === "publish") return "success";
  if (action === "reject") return "danger";
  if (action === "request_changes") return "warning";
  if (action === "submit_review" || action === "schedule") return "info";
  return "neutral";
}

export type { ArticleNoteType };
