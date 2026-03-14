/**
 * BottomSheet — Mobile-native slide-up panel.
 * On mobile (< 768px): renders as a bottom sheet with drag-to-dismiss.
 * On desktop: renders as a standard right-side Sheet.
 */
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Extra classes for the content wrapper */
  className?: string;
  /** Desktop sheet side (default: "right") */
  side?: "right" | "left";
  /** Max height on mobile as a percentage of viewport height (default: 90) */
  maxHeightPct?: number;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  side = "right",
  maxHeightPct = 90,
}: BottomSheetProps) {
  const isMobile = useIsMobile();

  // ── Drag-to-dismiss state ──────────────────────────────────────────────────
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Reset drag when sheet opens/closes
  useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDragY(delta); // only allow downward drag
  };

  function haptic(ms = 10) {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
  }

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 120) {
      haptic(12);
      onClose();
    } else {
      setDragY(0);
    }
  };

  // ── Mobile bottom sheet ────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        {/* Sheet panel */}
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background shadow-2xl",
            "transition-transform duration-300 ease-out",
            open ? "translate-y-0" : "translate-y-full",
            className
          )}
          style={{
            maxHeight: `${maxHeightPct}vh`,
            transform: open
              ? `translateY(${dragY}px)`
              : "translateY(100%)",
            transition: isDragging ? "none" : "transform 0.3s ease-out",
          }}
        >
          {/* Drag handle */}
          <div
            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 pb-3 border-b">
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Scrollable content */}
          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: `calc(${maxHeightPct}vh - 80px)` }}>
            {children}
          </div>
        </div>
      </>
    );
  }

  // ── Desktop: standard right-side Sheet ────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side={side} className={cn("w-full sm:max-w-lg overflow-y-auto", className)}>
        {title && (
          <SheetHeader className="mb-4">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}
