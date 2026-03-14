/**
 * PullToRefresh — native-feel pull-to-refresh for mobile lists.
 *
 * Usage:
 *   <PullToRefresh onRefresh={async () => { await refetch(); }}>
 *     <YourScrollableContent />
 *   </PullToRefresh>
 *
 * The component:
 * - Detects downward pull when the scroll container is at the top
 * - Shows a spinner that fills as the user pulls
 * - Triggers onRefresh() when pull exceeds TRIGGER_THRESHOLD
 * - Calls navigator.vibrate(10) on trigger for haptic feedback
 * - Resets automatically after onRefresh() resolves
 */
import { useRef, useState, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  /** Minimum pull distance (px) to trigger refresh. Default: 72 */
  threshold?: number;
  /** Maximum pull distance before clamping (px). Default: 100 */
  maxPull?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  className = "",
  threshold = 72,
  maxPull = 100,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isPullingRef = useRef(false);

  function haptic(ms = 10) {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    // Only activate pull-to-refresh when scrolled to the very top
    if (el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) {
      isPullingRef.current = false;
      setPullY(0);
      return;
    }
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy <= 0) { setPullY(0); return; }
    // Resistance: pull feels heavier the further you go
    const resistance = 0.45;
    const clamped = Math.min(maxPull, dy * resistance);
    setPullY(clamped);
  }, [isRefreshing, maxPull]);

  const onTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    if (pullY >= threshold) {
      haptic(12);
      setIsRefreshing(true);
      setPullY(threshold); // hold at threshold while refreshing
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
  }, [pullY, threshold, onRefresh]);

  const progress = Math.min(1, pullY / threshold);
  const isTriggered = pullY >= threshold;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center z-20 pointer-events-none"
        style={{
          top: 0,
          height: pullY,
          transition: isPullingRef.current ? "none" : "height 0.25s ease",
          overflow: "hidden",
        }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20"
          style={{
            opacity: progress,
            transform: `scale(${0.6 + progress * 0.4}) rotate(${progress * 180}deg)`,
            transition: isPullingRef.current ? "none" : "all 0.25s ease",
          }}
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <RefreshCw
              className="w-4 h-4 text-primary"
              style={{
                color: isTriggered ? "var(--primary)" : "var(--muted-foreground)",
              }}
            />
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        style={{
          transform: `translateY(${pullY}px)`,
          transition: isPullingRef.current ? "none" : "transform 0.25s ease",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
