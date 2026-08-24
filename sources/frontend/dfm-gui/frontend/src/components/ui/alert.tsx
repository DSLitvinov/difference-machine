import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full flex-col gap-3 overflow-clip rounded-lg border bg-background p-4",
  {
    variants: {
      variant: {
        default: "border-border text-foreground",
        destructive: "border-[#ef4444] text-[#ef4444]",
        warning: "border-[#ca8a04] text-[#a16207]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function CircleAlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={cn("size-5 shrink-0", className)}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 1.667A8.333 8.333 0 1 0 10 18.333 8.333 8.333 0 0 0 10 1.667ZM0 10C0 4.477 4.477 0 10 0s10 4.477 10 10-4.477 10-10 10S0 15.523 0 10Zm9 3.333a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM10 5a1 1 0 0 1 1 1v3.333a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Z"
      />
    </svg>
  );
}

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("min-w-0 flex-1 text-[16px] font-medium leading-6", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("min-w-0 flex-1 text-[14px] font-normal leading-5", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

type AlertBannerProps = {
  variant?: VariantProps<typeof alertVariants>["variant"];
  title: string;
  description?: string;
  className?: string;
  onClick?: () => void;
};

export function AlertBanner({ variant, title, description, className, onClick }: AlertBannerProps) {
  return (
    <Alert
      variant={variant}
      className={cn(onClick && "cursor-pointer text-left", className)}
      onClick={onClick}
    >
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full items-center gap-3">
          <CircleAlertIcon />
          <AlertTitle>{title}</AlertTitle>
        </div>
        {description ? (
          <div className="flex w-full items-center pl-7">
            <AlertDescription>{description}</AlertDescription>
          </div>
        ) : null}
      </div>
    </Alert>
  );
}
