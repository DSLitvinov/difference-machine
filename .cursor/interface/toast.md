# Toast notifications

Global feedback for informational messages and errors. All transient success/info copy and API failures use **Toast** in the **top-right** corner — not inline banners in the shell.

**Figma:** [shadcn/ui Toast `794:4504`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/shadcn-ui--The-Ultimate-UI-Kit-for-Figma--Community-?node-id=794-4504)  
**Implementation:** shadcn/ui `Toast` (`@radix-ui/react-toast`) — `components/ui/toast.tsx`, `components/ui/toaster.tsx`, `hooks/use-toast.ts`.

---

## 1. Placement and stacking

| Rule | Value |
|------|--------|
| Viewport | `fixed top-0 right-0`, `z-[100]`, `p-4`, `md:max-w-[420px]` |
| Stack | New toasts appear below previous (column, gap 2) |
| Limit | Up to 5 visible notices; persistent errors replace each other |

**Do not** use `fixed bottom-4 right-4` or custom one-off toast shells.

---

## 2. Variants

| Variant | Use | Duration | Dismiss |
|---------|-----|----------|---------|
| **default** | Success, copy, branch switched, settings saved, etc. | 4 s auto | Close button or timeout |
| **destructive** | API errors, Forester unavailable, invalid repo | Manual | Close button (X) |

### 2.1 Notice (default)

- Triggered via `appStore.setNotice(message)` or `notifyNotice`.
- Single line or short paragraph in **description** (no title required).
- Suppressed while a persistent `error` or `foresterError` is active.

### 2.2 Error (destructive)

- Triggered via `appStore.setError(message)`.
- **Title:** localized `common.error`.
- **Description:** API / validation message.
- **Re-open…** button when `repoPath` is null (broken / missing repo).
- Clearing: user dismiss, `setError(null)`, successful `setRepo`, or `clearRepo`.

### 2.3 Forester unavailable (destructive)

- Triggered via `appStore.setForesterError(message)`.
- **Title:** `common.foresterUnavailable`.
- **Description:** error detail + **Re-open** and **Retry** actions.
- Mutually exclusive with repo `error` toast (new one replaces the other).

---

## 3. What is **not** a toast

| Pattern | Where |
|---------|--------|
| **`Alert`** inline callout | Preview panels, empty states, dialog validation — [Figma `162:2550`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=162-2550) |
| **MergeDialog** merge blockers | In-dialog `Alert variant="destructive"` before submit |
| **ConfirmAlertDialog** | Destructive confirmations (revert, delete branch) |

Per [figma-gui-parity](../rules/figma-gui-parity.mdc): do not add toast-like UI outside the shadcn Toaster unless the mockup shows it.

---

## 4. Code map

| Module | Role |
|--------|------|
| `lib/appNotifications.tsx` | `notifyNotice`, `notifyError`, `notifyForesterError`; bridges store → `toast()` |
| `stores/appStore.ts` | `setNotice` / `setError` / `setForesterError` call notifications |
| `components/shell/AppToast.tsx` | Renders `<Toaster />` in `AppShell` |
| `components/ui/toast.tsx` | Radix primitives + variants |
| `components/ui/toaster.tsx` | Toast list + viewport |

### Adding feedback from a feature

```ts
const setNotice = useAppStore((s) => s.setNotice);
const setError = useAppStore((s) => s.setError);

// success / info
setNotice(t("common.copiedToClipboard"));

// failure
setError(err instanceof Error ? err.message : String(err));
```

Do **not** render local fixed-position message boxes for global feedback.

---

## 5. Anatomy (shadcn/ui)

Matches [shadcn Toast docs](https://ui.shadcn.com/docs/components/toast):

- `ToastProvider` + `ToastViewport` (top-right)
- `Toast` root — `default` | `destructive` variant
- `ToastTitle` — optional; errors use title
- `ToastDescription` — body text; may contain action buttons for repo/Forester recovery
- `ToastClose` — X in top-right of card
- Enter/exit: `slide-in-from-top-full`, `slide-out-to-right-full` (`tailwindcss-animate`)

---

## 6. Related documents

- [design-tokens.md §4.6](./design-tokens.md) — Toast row in shadcn control table
- [architecture.md §2](./architecture.md) — repo / Forester error flows
- [multi-repo.md](./multi-repo.md) — repository not found toast
