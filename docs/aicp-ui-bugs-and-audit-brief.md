# Brief for the AICP terminal — Dialog bugs (fix once, everywhere) + full UI audit

Console frontend: `web/` (Next.js). Three dialog bugs share a **single root cause file**:
`web/components/ui/dialog.tsx`. Every console dialog imports this one `Dialog` component (e.g.
`components/agents/agents-manager.tsx` uses it for Edit/New/Run/Tool/Workflow), so fixing this file
fixes them **everywhere** — no per-dialog changes needed.

---

## The three dialog bugs (all in `web/components/ui/dialog.tsx`)

Current component (abridged):
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center ... p-4" onClick={onClose}>
  <div className="w-full max-w-lg rounded-lg ... p-6" onClick={(e) => e.stopPropagation()}>
    <div className="mb-4 flex ...">{/* header */}</div>
    {children}
  </div>
</div>
```

1. **Tall dialogs clip off-screen (can't reach top/bottom).** The panel has **no `max-height` and no
   internal scroll**, and the overlay uses `items-center`. When content exceeds the viewport, centering
   pushes the top above and the bottom below the screen with nothing to scroll. (Several dialogs already
   hack `max-h-…` internally to dodge this — a smell that the primitive is wrong.)
2. **Selecting text closes the dialog and loses edits.** The overlay closes on `onClick`. When you
   drag to select text starting inside the panel and release on the backdrop, the browser fires the
   `click` on the nearest common ancestor (the overlay) → `onClose()`. `stopPropagation` on a plain
   `onClick` doesn't prevent this. Result: the dialog closes mid-selection, unsaved.
3. **Excessive vertical stacking (enhancement).** Form dialogs stack every field in one narrow column,
   making them tall (which then triggers #1). They should use horizontal space (wider size variants +
   multi-column form layout).

### Fix — replace the component body with this pattern
```tsx
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const downOnBackdrop = React.useRef(false);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";           // lock background scroll
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}   // press must START on backdrop
      onClick={(e) => { if (e.target === e.currentTarget && downOnBackdrop.current) onClose(); }} // …and END on it
    >
      <div className={cn(
        "flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-lg border border-border-strong bg-surface-2 shadow-elevated",
        className,
      )}>
        <div className="flex shrink-0 items-start justify-between gap-4 p-6 pb-4">{/* header */}</div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>   {/* scrolls internally */}
      </div>
    </div>
  );
}
```
Why it fixes all three:
- **#1**: panel is `flex flex-col max-h-[calc(100dvh-2rem)]`; body wrapper is `min-h-0 flex-1
  overflow-y-auto`, so content scrolls **inside** the dialog; the overlay is also `overflow-y-auto
  items-start` so an over-tall dialog scrolls the page rather than clipping. Use `dvh` (mobile chrome).
- **#2**: close only when the pointer both **starts and ends on the backdrop**
  (`downOnBackdrop` + `e.target === e.currentTarget`). Text-selection drags that start inside the panel
  no longer close it.
- **#3**: add `size` variants to the primitive (`sm/md/lg/xl` → `max-w-md … max-w-3xl`) and use
  two-column grids for form-heavy dialogs. Then remove the per-dialog `max-h-…` hacks.

Also: add a **focus trap + return focus on close** and `role="dialog" aria-modal="true"
aria-labelledby` while you're in here (see audit §A).

### Don't forget the ad-hoc overlays
Not every overlay uses the shared `Dialog`. These roll their own `fixed inset-0` and need the same
treatment (or migrate to the shared primitive/a shared `Sheet`/`Popover`):
`components/agent-studio/guided-setup.tsx`, `docs/doc-search.tsx`, `layout/ask-veevra.tsx`,
`layout/command-palette.tsx`, `layout/notifications.tsx`, `layout/tenant-env.tsx`,
`platform-studio/command.tsx`, `ui/data-table.tsx`, `ui/feedback.tsx`, `ui/side-panel.tsx`.

---

## Full UI audit — what to look at everywhere

Do this as a systematic pass, not screen-by-screen guesswork. Produce a report keyed by
**screen × state × locale** with one issue per finding.

**A. Overlays (modals, drawers, popovers, menus, command palettes)**
- Height-constrained with internal scroll (never clip); backdrop-close only on true backdrop
  press+release; `Escape`; background scroll-lock; **focus trap**; return focus to the trigger on close;
  `role`/`aria-modal`/labelledby. All overlays use shared primitives — no ad-hoc reimplementations.

**B. Responsive & overflow**
- Nothing overflows the viewport; the page body never scrolls horizontally. Wide content (tables,
  code, JSON, diagrams, long keys/ids) scrolls inside its own `overflow-x-auto` container. Test at
  narrow widths and 125–150% browser zoom.

**C. RTL / Arabic parity (this product ships Arabic)**
- Every screen rendered in `dir="rtl"`: use **logical properties** (`ms/me`, `ps/pe`, `start/end`,
  `text-start`) not `left/right`; mirror directional icons/carets/chevrons; popovers, dropdowns and
  tooltips must not fall off-screen in RTL (a known failure mode); numerals/tabular alignment correct.

**D. Accessibility & keyboard**
- Visible focus rings, logical tab order, all interactive elements keyboard-reachable, labels on icon
  buttons, sufficient color contrast in **both** light and dark themes.

**E. State coverage (per data surface)**
- Loading (skeleton, not layout jump), empty (helpful, not blank), and **error** states; long-text
  truncation/wrapping; very long lists virtualized or paginated.

**F. Layout density / horizontal space**
- Prefer multi-column layouts over tall single-column stacks; wide dialogs for form-heavy flows;
  consistent spacing scale.

**G. Consistency**
- One shared set of primitives (Button, Input, Dialog, Sheet, Popover, Table, Toast); no duplicated
  bespoke implementations that drift and re-introduce these bugs. Lint/guard against raw `fixed
  inset-0` outside the primitives.

**How to run:** build a shared, correct overlay primitive set; migrate all ad-hoc overlays to them;
add a Playwright/Storybook pass that opens every dialog with **overflowing content in both `en` and
`ar`** and asserts the header, footer, and a mid-body element are all in-viewport and reachable
(regression guard for bug #1); add a test that a mousedown-inside → mouseup-on-backdrop does **not**
close (regression guard for bug #2).

## Paste-ready message to the terminal

> Fix the shared dialog primitive and audit all UI. In `web/components/ui/dialog.tsx`: (1) tall
> dialogs clip off-screen — make the panel `flex flex-col max-h-[calc(100dvh-2rem)]` with an internal
> `min-h-0 flex-1 overflow-y-auto` body and an `overflow-y-auto items-start sm:items-center` overlay;
> (2) selecting text closes the dialog and loses edits — only close when the pointer **starts and ends
> on the backdrop** (track mousedown target; check `e.target === e.currentTarget`), not on
> selection-drags; (3) add `size` variants + multi-column form layout to reduce height; (4) add focus
> trap, scroll-lock, and aria-modal. Every console dialog imports this component, so this fixes them
> all — then apply the same to the ad-hoc `fixed inset-0` overlays (guided-setup, doc-search,
> ask-veevra, command-palette, notifications, tenant-env, platform-studio/command, data-table,
> feedback, side-panel) or migrate them to the shared primitive. Then run a full UI audit: overlays
> (height/backdrop-close/focus/a11y), responsive & overflow, **RTL/Arabic parity** (logical
> properties, mirrored icons, no off-screen popovers), keyboard/a11y, and loading/empty/error states.
> Add Playwright regression tests that open every dialog with overflowing content in **en and ar** and
> assert header/body/footer are reachable, and that a mousedown-inside → mouseup-on-backdrop does not
> close. Deliver a screen × state × locale gap report with one issue per finding.
