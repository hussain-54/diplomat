import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("cms-skeleton rounded-[2px]", className)}
      {...props}
    />
  );
}

export { Skeleton };
