import { Toaster } from "@/components/ui/toaster";

/** Mounts shadcn/ui toast viewport (top-right). Notifications are dispatched via appStore setters. */
export function AppToast() {
  return <Toaster />;
}
