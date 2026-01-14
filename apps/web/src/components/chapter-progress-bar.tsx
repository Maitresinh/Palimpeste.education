"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Maximize, Minimize } from "lucide-react";

interface Chapter {
  label: string;
  href: string;
  startPercentage: number;
  endPercentage: number;
}

interface ChapterProgressBarProps {
  toc: { label: string; href: string }[];
  rendition: any;
  currentProgressPercentage: number;
  onProgressChange?: (percentage: number) => void;
}

export function ChapterProgressBar({
  toc,
  rendition,
  currentProgressPercentage,
  onProgressChange,
}: ChapterProgressBarProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentChapterLabel, setCurrentChapterLabel] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPercentage, setHoverPercentage] = useState(0);
  const [hoverChapterLabel, setHoverChapterLabel] = useState("");
  const [isBarVisible, setIsBarVisible] = useState(true);
  const [dragPercentage, setDragPercentage] = useState(0); // Visual position during drag
  const [isFullscreen, setIsFullscreen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn("Fullscreen request failed:", err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn("Exit fullscreen failed:", err);
      });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Calculate chapter positions based on TOC and book locations
  useEffect(() => {
    if (!rendition?.book || !toc.length) return;

    const book = rendition.book;
    const spine = book.spine as any;
    const spineItems = spine?.spineItems || spine?.items || [];
    
    if (!spineItems.length) return;

    // Map TOC items to spine positions
    const chaptersWithPositions: Chapter[] = [];
    
    toc.forEach((tocItem, index) => {
      try {
        // Find the spine item that matches this TOC href
        const href = tocItem.href.split("#")[0]; // Remove fragment
        let spineIndex = spineItems.findIndex((item: any) => 
          item.href === href || 
          item.href?.endsWith(href) || 
          href?.endsWith(item.href)
        );
        
        if (spineIndex === -1) {
          // Try a more lenient match
          spineIndex = spineItems.findIndex((item: any) => {
            const itemHref = item.href?.split("/").pop()?.split("#")[0];
            const tocHref = href?.split("/").pop()?.split("#")[0];
            return itemHref === tocHref;
          });
        }

        // Calculate percentage based on spine position
        const startPercentage = spineIndex >= 0 
          ? (spineIndex / spineItems.length) * 100 
          : (index / toc.length) * 100;
        
        // End percentage is the start of the next chapter or 100%
        const endPercentage = index < toc.length - 1
          ? ((spineIndex >= 0 ? spineIndex + 1 : index + 1) / spineItems.length) * 100
          : 100;

        chaptersWithPositions.push({
          label: tocItem.label.trim(),
          href: tocItem.href,
          startPercentage: Math.max(0, Math.min(100, startPercentage)),
          endPercentage: Math.max(0, Math.min(100, endPercentage)),
        });
      } catch (e) {
        // Fallback to evenly distributed chapters
        chaptersWithPositions.push({
          label: tocItem.label.trim(),
          href: tocItem.href,
          startPercentage: (index / toc.length) * 100,
          endPercentage: ((index + 1) / toc.length) * 100,
        });
      }
    });

    setChapters(chaptersWithPositions);
  }, [rendition, toc]);

  // Helper to normalize href for comparison
  const normalizeHref = useCallback((href: string): string => {
    if (!href) return "";
    // Remove fragment, get just the filename
    return href.split("#")[0].split("/").pop()?.toLowerCase() || "";
  }, []);

  // Get current chapter from rendition's current location
  const getCurrentChapterFromLocation = useCallback(() => {
    if (!rendition?.book || !toc.length) return null;

    try {
      const currentLocation = rendition.currentLocation() as any;
      if (!currentLocation?.start) return null;

      const book = rendition.book;
      const spine = book.spine as any;
      const spineItems = spine?.spineItems || spine?.items || [];
      const currentSpineIndex = currentLocation.start.index;
      const currentHref = currentLocation.start.href;

      // Strategy 1: Match by normalized href (filename)
      if (currentHref) {
        const currentFile = normalizeHref(currentHref);
        
        // Find matching TOC entries
        for (let i = toc.length - 1; i >= 0; i--) {
          const tocFile = normalizeHref(toc[i].href);
          if (tocFile === currentFile) {
            return { label: toc[i].label.trim(), index: i };
          }
        }
      }

      // Strategy 2: Find by spine index - get the last TOC item that starts at or before current position
      if (currentSpineIndex !== undefined && spineItems.length > 0) {
        // Build a map of TOC items to their spine indices
        const tocSpineIndices: { tocIndex: number; spineIndex: number; label: string }[] = [];
        
        for (let i = 0; i < toc.length; i++) {
          const tocFile = normalizeHref(toc[i].href);
          const spineIdx = spineItems.findIndex((item: any) => 
            normalizeHref(item.href) === tocFile
          );
          if (spineIdx !== -1) {
            tocSpineIndices.push({ tocIndex: i, spineIndex: spineIdx, label: toc[i].label.trim() });
          }
        }

        // Sort by spine index and find the last one <= current
        tocSpineIndices.sort((a, b) => a.spineIndex - b.spineIndex);
        
        let bestMatch: { tocIndex: number; spineIndex: number; label: string } | null = null;
        for (const entry of tocSpineIndices) {
          if (entry.spineIndex <= currentSpineIndex) {
            bestMatch = entry;
          } else {
            break;
          }
        }

        if (bestMatch) {
          return { label: bestMatch.label, index: bestMatch.tocIndex };
        }
      }

      // Strategy 3: Fallback to first TOC item if we're at the beginning
      if (currentSpineIndex === 0 || currentProgressPercentage < 5) {
        return { label: toc[0].label.trim(), index: 0 };
      }

      return null;
    } catch (e) {
      console.warn("Error getting current chapter:", e);
      return null;
    }
  }, [rendition, toc, normalizeHref, currentProgressPercentage]);

  // Update current chapter based on location changes
  useEffect(() => {
    const updateChapter = () => {
      const chapterInfo = getCurrentChapterFromLocation();
      if (chapterInfo) {
        setCurrentChapterLabel(chapterInfo.label);
        if (chapterInfo.index !== -1) {
          setCurrentChapterIndex(chapterInfo.index);
        }
      }
    };

    // Update immediately
    updateChapter();

    // Also listen for location changes
    if (rendition) {
      rendition.on("relocated", updateChapter);
      rendition.on("rendered", updateChapter);
      
      // Fallback: periodic check for mobile scroll mode where events may not fire
      const intervalId = setInterval(updateChapter, 2000);
      
      return () => {
        rendition.off("relocated", updateChapter);
        rendition.off("rendered", updateChapter);
        clearInterval(intervalId);
      };
    }
  }, [rendition, getCurrentChapterFromLocation]);

  // Also update when progress percentage changes significantly
  const lastProgressRef = useRef(currentProgressPercentage);
  useEffect(() => {
    // Only update if progress changed by more than 1%
    if (Math.abs(currentProgressPercentage - lastProgressRef.current) > 1) {
      lastProgressRef.current = currentProgressPercentage;
      const chapterInfo = getCurrentChapterFromLocation();
      if (chapterInfo) {
        setCurrentChapterLabel(chapterInfo.label);
        if (chapterInfo.index !== -1) {
          setCurrentChapterIndex(chapterInfo.index);
        }
      }
    }
  }, [currentProgressPercentage, getCurrentChapterFromLocation]);

  // Track if we're in the middle of navigation to avoid conflicts
  const isNavigatingRef = useRef(false);

  // Navigate to a specific percentage (raw function)
  const navigateToPercentageRaw = useCallback(async (percentage: number) => {
    if (!rendition?.book?.locations || isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    
    try {
      const cfi = rendition.book.locations.cfiFromPercentage(percentage / 100);
      if (cfi) {
        // Use the same display method as annotations
        await rendition.display(cfi);
        onProgressChange?.(percentage);
      }
    } catch (e) {
      console.warn("Failed to navigate to percentage:", e);
    } finally {
      // Add a small delay before allowing next navigation
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 50);
    }
  }, [rendition, onProgressChange]);

  // Navigate to a specific chapter - using spine item for more reliable navigation
  const navigateToChapter = useCallback(async (chapterIndex: number) => {
    if (!rendition || chapterIndex < 0 || chapterIndex >= chapters.length || isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    const chapter = chapters[chapterIndex];
    
    try {
      // First try: Use CFI from percentage (more reliable)
      const cfi = rendition.book?.locations?.cfiFromPercentage(chapter.startPercentage / 100);
      if (cfi) {
        await rendition.display(cfi);
        setCurrentChapterIndex(chapterIndex);
      } else {
        // Fallback: Use href directly
        await rendition.display(chapter.href);
        setCurrentChapterIndex(chapterIndex);
      }
    } catch (e) {
      console.warn("Failed to navigate to chapter:", e);
      // Try href as last resort
      try {
        await rendition.display(chapter.href);
        setCurrentChapterIndex(chapterIndex);
      } catch (fallbackError) {
        console.warn("Fallback navigation also failed:", fallbackError);
      }
    } finally {
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
    }
  }, [rendition, chapters]);

  // Handle wheel scroll on the progress bar to navigate chapters
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!chapters.length) return;
    
    const direction = e.deltaY > 0 ? 1 : -1;
    const newIndex = Math.max(0, Math.min(chapters.length - 1, currentChapterIndex + direction));
    
    if (newIndex !== currentChapterIndex) {
      navigateToChapter(newIndex);
    }
  }, [currentChapterIndex, chapters.length, navigateToChapter]);

  // Track if this is a click or a drag
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const isClickRef = useRef(true);

  // Handle mouse events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    isClickRef.current = true;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, percentage));
    setDragPercentage(clamped);
    // Don't navigate on mouse down, wait for mouse up
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!barRef.current) return;
    
    const rect = barRef.current.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    
    setHoverPercentage(clampedPercentage);
    
    // Find which chapter we're hovering over
    if (chapters.length) {
      const chapterIndex = chapters.findIndex(
        (ch, i) => 
          clampedPercentage >= ch.startPercentage && 
          (i === chapters.length - 1 || clampedPercentage < chapters[i + 1]?.startPercentage)
      );
      if (chapterIndex !== -1) {
        setHoverChapterLabel(chapters[chapterIndex].label);
      }
    }
    
    if (isDragging) {
      // Check if user has moved more than 5px - if so, it's a drag not a click
      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isClickRef.current = false;
      }
      // Update visual position immediately (no navigation during drag)
      setDragPercentage(clampedPercentage);
    }
  }, [isDragging, chapters]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragPercentage > 0) {
      // Navigate on release (works for both click and drag)
      navigateToPercentageRaw(dragPercentage);
    }
    setIsDragging(false);
    isClickRef.current = true;
  }, [isDragging, dragPercentage, navigateToPercentageRaw]);

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      // Prevent scroll while dragging
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.overflow = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle hover state for the bar
  const handleBarMouseEnter = () => setIsHovering(true);
  const handleBarMouseLeave = () => {
    if (!isDragging) {
      setIsHovering(false);
      setHoverPercentage(0);
      setHoverChapterLabel("");
    }
  };

  // Local mouse move for hover updates
  const handleLocalMouseMove = useCallback((e: React.MouseEvent) => {
    if (!barRef.current) return;
    
    const rect = barRef.current.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    
    setHoverPercentage(clampedPercentage);
    
    // Find which chapter we're hovering over
    if (chapters.length) {
      const chapterIndex = chapters.findIndex(
        (ch, i) => 
          clampedPercentage >= ch.startPercentage && 
          (i === chapters.length - 1 || clampedPercentage < chapters[i + 1]?.startPercentage)
      );
      if (chapterIndex !== -1) {
        setHoverChapterLabel(chapters[chapterIndex].label);
      }
    }
  }, [chapters]);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    if (!barRef.current) return;
    const touch = e.touches[0];
    const rect = barRef.current.getBoundingClientRect();
    const percentage = ((touch.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, percentage));
    setDragPercentage(clamped);
    // Don't navigate on touch start, wait for touch end
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!barRef.current || !isDragging) return;
    
    const touch = e.touches[0];
    const rect = barRef.current.getBoundingClientRect();
    const percentage = ((touch.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, percentage));
    // Update visual position only, no navigation during drag
    setDragPercentage(clamped);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging && dragPercentage > 0) {
      // Navigate only when releasing the touch
      navigateToPercentageRaw(dragPercentage);
    }
    setIsDragging(false);
  }, [isDragging, dragPercentage, navigateToPercentageRaw]);

  const hasChapters = chapters.length > 0;

  return (
    <>
      {/* Floating progress bar */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ${
          isBarVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
        }`}
      >
        {/* Hide button - centered above */}
        <button
          onClick={() => setIsBarVisible(false)}
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-400 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors px-2.5 py-1 rounded-md shadow-sm hover:shadow"
          title="Masquer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Chapter info tooltip on hover */}
        {(isHovering || isDragging) && (hoverChapterLabel || !hasChapters) && (
          <div
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none z-10"
          >
            <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap shadow-lg">
              {hoverChapterLabel || "Progression"}
              <span className="ml-2 opacity-50 tabular-nums">{Math.round(hoverPercentage)}%</span>
            </div>
          </div>
        )}

        {/* Floating container */}
        <div className="bg-white dark:bg-neutral-900 backdrop-blur-xl rounded-xl px-4 py-3 shadow-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            {/* Progress bar wrapper - larger hit area */}
            <div
              ref={barRef}
              className="relative cursor-pointer w-64 sm:w-80 md:w-[28rem] lg:w-[36rem] xl:w-[42rem] py-3 -my-3"
              onMouseDown={handleMouseDown}
              onMouseEnter={handleBarMouseEnter}
              onMouseLeave={handleBarMouseLeave}
              onMouseMove={handleLocalMouseMove}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Visual progress bar - stays small */}
              <div
                className={`relative overflow-hidden transition-all duration-200 ${
                  isHovering || isDragging ? "h-1.5" : "h-1"
                }`}
              >
                {/* Background */}
                <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" />
                
                {/* Filled progress - continuous and accurate */}
                <div
                  className="absolute inset-y-0 left-0 bg-indigo-500 transition-[width] duration-100"
                  style={{ width: `${currentProgressPercentage}%` }}
                />
                
                {/* Chapter separators - visual only */}
                {hasChapters && chapters.length > 1 && (
                  <div className="absolute inset-0 flex items-center pointer-events-none">
                    {chapters.slice(1).map((chapter, index) => (
                      <div
                        key={index}
                        className="absolute h-full w-0.5 bg-white dark:bg-neutral-900"
                        style={{ left: `${chapter.startPercentage}%` }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Hover preview line */}
              {(isHovering || isDragging) && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-4 w-px bg-indigo-600 dark:bg-indigo-400 pointer-events-none"
                  style={{ left: `${hoverPercentage}%` }}
                />
              )}

              {/* Drag handle - visible on hover */}
              <div
                className={`absolute top-1/2 w-2.5 h-2.5 bg-indigo-500 shadow-sm border-2 border-white dark:border-neutral-900 ${
                  isHovering || isDragging ? "scale-100 opacity-100" : "scale-0 opacity-0"
                } ${isDragging ? "" : "transition-all duration-150"}`}
                style={{ 
                  left: `${isDragging ? dragPercentage : currentProgressPercentage}%`, 
                  transform: "translate(-50%, -50%)" 
                }}
              />
            </div>

            {/* Percentage */}
            <span className="text-neutral-400 dark:text-neutral-500 text-[11px] tabular-nums font-medium min-w-[28px] text-right">
              {Math.round(currentProgressPercentage)}%
            </span>

            {/* Fullscreen toggle button */}
            <button
              onClick={toggleFullscreen}
              className="ml-1 p-1.5 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Current chapter name - centered */}
          {currentChapterLabel && (
            <div className="flex justify-center mt-1.5 -mb-0.5 px-2">
              <span className="text-neutral-600 dark:text-neutral-300 text-[11px] font-medium truncate max-w-[260px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-[520px] xl:max-w-[620px] text-center">
                {currentChapterLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Show button when bar is hidden */}
      {!isBarVisible && (
        <button
          onClick={() => setIsBarVisible(true)}
          className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[60] bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 px-3 py-1 rounded-md transition-all duration-200 opacity-50 hover:opacity-100 shadow-sm hover:shadow"
          title="Afficher la barre de progression"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
    </>
  );
}
