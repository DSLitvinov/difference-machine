import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

type TabsSize = "sm" | "default" | "lg";

const TabsSizeContext = React.createContext<TabsSize>("default");

const listSize: Record<TabsSize, string> = {
  sm: "rounded-[10px] p-0.5",
  default: "rounded-[10px] p-[3px]",
  lg: "rounded-[14px] p-1",
};

const triggerSize: Record<TabsSize, string> = {
  sm: "min-h-5 min-w-5 rounded-md px-1.5 py-px text-xs leading-4",
  default: "min-h-[29px] rounded-[10px] px-2 py-1 text-sm leading-5",
  lg: "min-h-8 min-w-8 rounded-[10px] px-2.5 py-[5.5px] text-sm leading-5",
};

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { size?: TabsSize }
>(({ className, size = "default", ...props }, ref) => (
  <TabsSizeContext.Provider value={size}>
    <TabsPrimitive.List
      ref={ref}
      className={cn("inline-flex items-center bg-[#e4e4e7] dark:bg-background-muted", listSize[size], className)}
      {...props}
    />
  </TabsSizeContext.Provider>
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const size = React.useContext(TabsSizeContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium text-[#18181b] hover:bg-[#e4e4e7] data-[state=active]:bg-white data-[state=active]:shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)] data-[state=active]:hover:bg-white disabled:pointer-events-none dark:text-foreground dark:data-[state=active]:bg-background",
        triggerSize[size],
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-0", className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
