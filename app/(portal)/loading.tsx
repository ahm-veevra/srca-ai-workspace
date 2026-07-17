import { PageHeaderSkeleton, Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/** Default route-level skeleton for the workspace — shows the page's structure instantly on
 * every navigation while the segment's data streams in. Content-heavy segments can override
 * this with their own loading.tsx. */
export default function PortalLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="ms-auto h-9 w-36" />
      </div>
      <TableSkeleton />
    </div>
  );
}
