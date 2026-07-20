import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { CATEGORY_WIZARD_STEPS } from "@/lib/category-types";

export function CategoryStepper({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick?: (step: number) => void;
}) {
  return (
    <nav aria-label="Category wizard progress" className="overflow-x-auto pb-2">
      <ol className="flex min-w-max items-center gap-1">
        {CATEGORY_WIZARD_STEPS.map((step, index) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <li key={step.id} className="flex items-center">
              <button
                type="button"
                disabled={!onStepClick}
                onClick={() => onStepClick?.(step.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium cms-transition",
                  active && "bg-primary text-primary-foreground shadow-sm",
                  done && !active && "bg-muted/60 text-foreground",
                  !active && !done && "text-muted-foreground hover:bg-muted/40",
                  !onStepClick && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-inset",
                    active && "bg-primary-foreground/20 ring-primary-foreground/30",
                    done && !active && "bg-cat-green/15 text-cat-green ring-cat-green/30",
                    !active && !done && "bg-background ring-border",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : step.id}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < CATEGORY_WIZARD_STEPS.length - 1 ? (
                <span className="mx-1 hidden h-px w-4 bg-border sm:block" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
