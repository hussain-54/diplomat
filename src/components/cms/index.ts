export { DataTable, DataTableRow, DataTableCell, DataTableEmpty } from "./data-table";
export type { DataTableColumn } from "./data-table";

export { StatusBadge, statusToneFor } from "./status-badge";
export type { StatusTone } from "./status-badge";

export { MetricCard } from "./metric-card";
export { PageHeader } from "./page-header";
export {
  FilterBar,
  FilterChip,
  FilterField,
  SegmentedControl,
  SegmentedItem,
} from "./filter-bar";
export { CmsPagination } from "./pagination";
export { CmsPageSkeleton, CmsTableSkeleton } from "./loading";
export { RoleGuard } from "./role-guard";
export { NotificationCenter, NotificationList } from "./notification-center";
export type { NotificationItem } from "./notification-center";
export { MediaUploader } from "./media-uploader";
export { SEOForm } from "./seo-form";
export type { SEOFormValue } from "./seo-form";
export { RichEditor } from "./rich-editor";
export type { RichEditorProps, Block } from "./rich-editor";
export { Field } from "./field";

export {
  CmsPageHeader,
  CmsPanel,
  CmsStat,
  CmsStatus,
  CmsEmptyState,
  CmsAlert,
  cmsButton,
  cmsSecondaryButton,
  cmsGhostButton,
  cmsInput,
} from "@/components/cms-ui";

/** Phase 12 dashboard aliases — reuse existing primitives (no duplicates) */
export { CmsEmptyState as EmptyState } from "@/components/cms-ui";
export { MetricCard as StatCard } from "./metric-card";
export { PageHeader as DashboardHeader } from "./page-header";
export { CmsPageSkeleton as SkeletonLoader } from "./loading";
export { NotificationCenter as NotificationPanel } from "./notification-center";
