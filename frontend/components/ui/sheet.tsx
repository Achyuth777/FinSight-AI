"use client";
import * as Dialog from "@radix-ui/react-dialog";
// Modal surface (right-hand on tablets, bottom sheet on phones). Radix traps focus and closes on Escape.
// It portals to <body>, so both nodes carry .ws to pick up the workspace tokens.
export function Sheet({ open, onOpenChange, onOpenAutoFocus, onCloseAutoFocus, labelledBy = "evidence-title", describedBy = "evidence-sub", children }: { labelledBy?: string; describedBy?: string; open: boolean; onOpenChange: (o: boolean) => void; onOpenAutoFocus?: (e: Event) => void; onCloseAutoFocus?: (e: Event) => void; children: React.ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ws dialog-overlay" />
        <Dialog.Content className="ws drawer sheet" aria-labelledby={labelledBy} aria-describedby={describedBy} onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={onCloseAutoFocus}>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;
