"use client";
import * as Dialog from "@radix-ui/react-dialog";
// Modal surface (right-hand on tablets, bottom sheet on phones). Radix traps focus and closes on Escape.
export function Sheet({ open, onOpenChange, onOpenAutoFocus, onCloseAutoFocus, children }: { open: boolean; onOpenChange: (o: boolean) => void; onOpenAutoFocus?: (e: Event) => void; onCloseAutoFocus?: (e: Event) => void; children: React.ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="drawer sheet" onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={onCloseAutoFocus}>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;
export const SheetClose = Dialog.Close;
