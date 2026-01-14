"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ReactReader, ReactReaderStyle } from 'react-reader';
import type { Annotation } from '@/hooks/use-epub-annotations';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/utils/trpc';

// Hook to detect mobile viewport
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

interface EpubReaderProps {
  url: string;
  initialLocation?: string | null;
  annotations: Annotation[];
  onLocationChange?: (cfi: string) => void;
  onTextSelect?: (cfiRange: string, text: string, rect: DOMRect) => void;
  onAnnotationClick: (annotation: Annotation, rect: DOMRect) => void;
  getRendition?: (rendition: any) => void;
  onLocationsReady?: () => void;
  onScrollDirectionChange?: (direction: 'up' | 'down') => void;
  onCenterTap?: () => void;
  height?: string | number;
  readingMode?: 'paginated' | 'scrolled';
}

export default function EpubReader({
  url,
  initialLocation,
  annotations,
  onLocationChange,
  onTextSelect,
  onAnnotationClick,
  getRendition,
  onLocationsReady,
  onScrollDirectionChange,
  onCenterTap,
  height = '100%',
  readingMode: propReadingMode
}: EpubReaderProps) {
  // Don't set location from initialLocation immediately - wait for validation first
  const [location, setLocation] = useState<string | number | undefined>(undefined);
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookReady, setBookReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renditionRef = useRef<any>(null);
  const lastScrollY = useRef<number>(0);
  const lastScrollDirection = useRef<'up' | 'down' | null>(null);
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  // Track if we've recovered from an error
  const hasRecoveredRef = useRef(false);

  // Track previous chapter loading state
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const loadingPreviousRef = useRef(false); // Ref for access in event listeners

  // Scroll anchoring system - tracks scroll height to detect prepended content
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const isNearTopRef = useRef(false);

  console.log("🔧 EpubReader rendering, location state:", location, "initialLocation prop:", initialLocation);

  // Global error handler for unhandled "No Section Found" errors
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason);
      if (errorMessage.includes('No Section Found') && !hasRecoveredRef.current) {
        console.warn("🚨 Caught unhandled 'No Section Found' rejection, recovering...");
        event.preventDefault(); // Prevent the error from showing in console
        hasRecoveredRef.current = true;

        // Clear the invalid location and try to display from start
        setLocation(undefined);

        if (renditionRef.current) {
          setTimeout(() => {
            try {
              console.log("🔄 Attempting to recover by displaying from start");
              renditionRef.current.display();
            } catch (e) {
              console.error("Recovery failed:", e);
            }
          }, 100);
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  // Charger les paramètres de lecture
  const { data: readerSettings } = useQuery(
    trpc.reading.getReaderSettings.queryOptions()
  );

  // Get effective reading mode (declared early for use in effects)
  const effectiveReadingMode = propReadingMode || readerSettings?.readingMode || 'paginated';

  // Load EPUB file as ArrayBuffer
  useEffect(() => {
    const loadEpub = async () => {
      try {
        setLoading(true);
        setBookReady(false);
        setError(null);

        console.log("📚 Loading EPUB from URL:", url);

        // First, verify the file exists and is accessible
        const response = await fetch(url, { credentials: "include" });
        console.log("📥 Fetch response status:", response.status, response.statusText);
        console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Fetch error:", errorText);
          throw new Error(`Failed to load EPUB: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log("✅ EPUB loaded, size:", arrayBuffer.byteLength, "bytes");

        if (arrayBuffer.byteLength === 0) {
          throw new Error("Le fichier EPUB est vide");
        }

        // Verify it's a valid EPUB (starts with PK for ZIP format)
        const uint8Array = new Uint8Array(arrayBuffer.slice(0, 2));
        const isValidZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B; // PK signature
        console.log("📦 EPUB ZIP signature check:", isValidZip ? "✅ Valid" : "❌ Invalid");

        if (!isValidZip) {
          throw new Error("Le fichier n'est pas un EPUB valide (format ZIP invalide)");
        }

        console.log("✅ ArrayBuffer ready for ReactReader");
        setEpubData(arrayBuffer);
      } catch (error) {
        console.error("❌ Error loading EPUB:", error);
        const errorMessage = error instanceof Error ? error.message : "Erreur lors du chargement du livre";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      loadEpub();
    } else {
      console.warn("⚠️ No URL provided to EpubReader");
      setError("Aucune URL fournie");
      setLoading(false);
    }
  }, [url]);

  // Track if we've done the initial location setup
  const initialLocationSetRef = useRef(false);
  // Track if we've had a navigation error (invalid CFI)
  const hasNavigationErrorRef = useRef(false);

  // Cleanup MutationObserver on unmount
  useEffect(() => {
    return () => {
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
        mutationObserverRef.current = null;
      }
    };
  }, []);

  // Don't automatically set location from initialLocation prop
  // We'll set it after validation in the book.ready callback

  // Inject styles into the iframe
  const injectStyles = (rendition: any) => {
    const isScrollMode = effectiveReadingMode === 'scrolled';

    const styles = `
      html, body {
        ${isScrollMode ? `
          margin: 0 !important;
          padding: 0 !important;
          padding-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        ` : ''}
        padding-bottom: 30vh !important;
        ${isScrollMode ? `
          overflow-x: hidden !important;
          overflow-anchor: none !important;
        ` : ''}
      }
      ${isScrollMode ? `
        body, body > *, section, article, div, p, h1, h2, h3, h4, h5, h6 {
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 16px !important;
          padding-right: 16px !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        p:first-child, h1:first-child, h2:first-child, h3:first-child {
          margin-top: 0 !important;
        }
      ` : ''}
      .annotation-highlight {
        cursor: pointer !important;
        transition: all 0.15s ease;
      }
      .annotation-highlight:hover {
        opacity: 0.9;
        stroke: rgba(99, 102, 241, 0.5);
        stroke-width: 2px;
      }
      ::selection {
        background: rgba(99, 102, 241, 0.3);
      }
    `;

    rendition.hooks.content.register((contents: any) => {
      const style = contents.document.createElement('style');
      style.innerHTML = styles;
      contents.document.head.appendChild(style);
    });
  };


  const onLocationChanged = (cfi: string) => {
    // In scroll mode, don't update state to avoid re-renders that fight with scroll position
    // Just call the parent callback for progress tracking
    if (effectiveReadingMode === 'scrolled') {
      if (onLocationChange) {
        onLocationChange(cfi);
      }
      return;
    }

    // In paginated mode, update state normally
    setLocation(cfi);
    if (onLocationChange) {
      onLocationChange(cfi);
    }
  };

  // Track ID -> CFI to remove them properly
  const appliedMap = useRef<Map<string, string>>(new Map());

  // Function to apply annotations to the rendition
  const applyAnnotations = useCallback(() => {
    const rendition = renditionRef.current;
    if (!rendition || !bookReady) return;

    console.log("🖍️ Applying annotations:", annotations.length);
    const newIds = new Set(annotations.map(a => a.id));

    // Remove deleted annotations
    appliedMap.current.forEach((cfi, id) => {
      if (!newIds.has(id)) {
        try {
          rendition.annotations.remove(cfi, "highlight");
          appliedMap.current.delete(id);
        } catch (e) {
          // Annotation might not exist anymore, that's ok
        }
      }
    });

    // Add new annotations
    annotations.forEach(ann => {
      if (!appliedMap.current.has(ann.id)) {
        try {
          // Pre-check if the range is valid in the current view to avoid "this.range is null" crash
          try {
            const range = rendition.getRange(ann.cfiRange);
            if (!range) {
              // Range not found in current view/chapter - this is normal for multi-chapter books
              // We'll skip trying to add it for now, it might be added when we scroll/navigate
              return;
            }
          } catch (rangeErr) {
            // Invalid CFI or other error resolving range
            return;
          }

          rendition.annotations.add(
            "highlight",
            ann.cfiRange,
            { id: ann.id },
            (e: MouseEvent) => {
              const renditionAny = rendition as any;
              const iframe = renditionAny.manager?.container?.querySelector('iframe');
              let xOffset = 0, yOffset = 0;
              if (iframe) {
                const r = iframe.getBoundingClientRect();
                xOffset = r.left;
                yOffset = r.top;
              }

              const target = e.target as HTMLElement;
              const rect = target.getBoundingClientRect();
              const absoluteRect = new DOMRect(
                rect.left + xOffset,
                rect.top + yOffset,
                rect.width,
                rect.height
              );
              onAnnotationClick(ann, absoluteRect);
            },
            "annotation-highlight",
            {
              fill: ann.highlightColor,
              "fill-opacity": "0.3",
              "mix-blend-mode": "multiply"
            }
          );
          appliedMap.current.set(ann.id, ann.cfiRange);
        } catch (e) {
          console.warn("Could not apply annotation:", ann.id, e);
        }
      }
    });
  }, [annotations, onAnnotationClick, bookReady]);

  // Apply annotations when they change
  useEffect(() => {
    applyAnnotations();
  }, [applyAnnotations]);

  // Appliquer les paramètres de lecture quand ils changent
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || !bookReady || !readerSettings) return;

    const fontSize = readerSettings.fontSize || 16;
    const lineHeight = readerSettings.lineHeight || 150;
    const fontFamily = readerSettings.fontFamily || 'system-ui';
    const readerTheme = readerSettings.theme || 'light';

    // Couleurs selon le thème choisi
    let textColor = '#000';
    let bgColor = '#fff';
    if (readerTheme === 'dark') {
      textColor = '#fff';
      bgColor = '#000000'; // pure black
    } else if (readerTheme === 'sepia') {
      textColor = '#5c4a3a';
      bgColor = '#f4ecd8';
    }

    // Utiliser override pour forcer la mise à jour des styles
    rendition.themes.override('color', textColor);
    rendition.themes.override('background', bgColor);
    rendition.themes.override('font-family', fontFamily);
    rendition.themes.override('font-size', `${fontSize}px`);
    rendition.themes.override('line-height', `${lineHeight / 100}`);

    console.log("🎨 Paramètres appliqués:", { fontSize, lineHeight, fontFamily, readerTheme });

    // Supprimer toutes les annotations existantes puis les ré-appliquer
    // après un délai pour laisser le temps au rendu de se faire
    appliedMap.current.forEach((cfi) => {
      try {
        rendition.annotations.remove(cfi, "highlight");
      } catch (e) {
        // Ignore errors
      }
    });
    appliedMap.current.clear();

    // Attendre que le nouveau layout soit appliqué, puis ré-appliquer les annotations
    setTimeout(() => {
      applyAnnotations();
    }, 300);
  }, [readerSettings, theme, bookReady, applyAnnotations]);

  // Force re-apply annotations on page navigation (rendered/relocated events)
  const handleRendered = useCallback(() => {
    // Small delay to ensure the page is fully rendered
    setTimeout(() => {
      applyAnnotations();
      
      // Force full-width in scroll mode
      if (effectiveReadingMode === 'scrolled' && renditionRef.current) {
        const manager = (renditionRef.current as any).manager;
        if (manager?.container) {
          manager.container.style.margin = '0';
          manager.container.style.padding = '0 16px';
          manager.container.style.width = '100%';
          manager.container.style.maxWidth = '100%';
          manager.container.style.left = '0';
          manager.container.style.right = '0';
        }
        // Also target iframes
        const iframes = manager?.container?.querySelectorAll('iframe');
        if (iframes) {
          iframes.forEach((iframe: HTMLIFrameElement) => {
            iframe.style.width = '100%';
            iframe.style.maxWidth = '100%';
            iframe.style.margin = '0';
            iframe.style.left = '0';
          });
        }
      }
    }, 100);
  }, [applyAnnotations, effectiveReadingMode]);


  if (loading || !epubData) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Chargement du livre...</p>
        </div>
      </div>
    );
  }

  // Show loading overlay while book is initializing
  const showLoadingOverlay = !bookReady;

  if (error) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 mb-4">
            <p className="font-semibold text-lg mb-2">Erreur de chargement</p>
            <p className="text-sm">{error}</p>
            {url && (
              <p className="text-xs text-gray-500 mt-2 break-all">
                URL: {url}
              </p>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                // Trigger reload by clearing epubData
                setEpubData(null);
                // The useEffect will reload when epubData becomes null and url is still set
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height, position: 'relative', overflow: 'hidden' }}>
      {/* Loading Previous Chapter Indicator */}
      {loadingPrevious && (
        <div className="absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
            <span>Chargement du chapitre précédent...</span>
          </div>
        </div>
      )}

      {showLoadingOverlay && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 50
        }} className="dark:bg-black/90">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p>Préparation du livre...</p>
          </div>
        </div>
      )}
      <ReactReader
        key={`reader-${effectiveReadingMode}-${isMobile}`}
        url={epubData}
        location={location || null}
        locationChanged={onLocationChanged}
        readerStyles={(() => {
          // Base styles - hide TOC for all modes
          const baseStyles = {
            tocArea: { display: 'none' },
            tocButton: { display: 'none' },
            tocButtonExpanded: { display: 'none' },
          };

          // Scrolled mode: no margins, no arrows, full width
          if (effectiveReadingMode === 'scrolled') {
            return {
              ...ReactReaderStyle,
              ...baseStyles,
              arrow: { display: 'none' },
              reader: {
                position: 'absolute',
                inset: 0,
                padding: 0,
                margin: 0,
                width: '100%',
              },
              readerArea: {
                position: 'absolute',
                inset: 0,
                padding: 0,
                margin: 0,
                width: '100%',
                backgroundColor: 'inherit',
              },
              container: {
                padding: 0,
                margin: 0,
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                boxSizing: 'border-box',
              },
              epubView: {
                position: 'absolute',
                inset: 0,
                padding: 0,
                margin: 0,
                width: '100%',
                border: 'none',
              },
            };
          }

          // Mobile paginated: smaller arrows
          if (isMobile) {
            return {
              ...ReactReaderStyle,
              ...baseStyles,
              arrow: {
                ...ReactReaderStyle.arrow,
                minWidth: '24px',
                padding: '0 4px',
              },
              readerArea: {
                ...ReactReaderStyle.readerArea,
                padding: '0 4px',
              },
            };
          }

          // Desktop paginated: just hide TOC
          return {
            ...ReactReaderStyle,
            ...baseStyles,
          };
        })()}
        getRendition={(rendition) => {
          console.log("✅ Rendition loaded");
          renditionRef.current = rendition;
          if (getRendition) {
            getRendition(rendition);
          }

          // Error handling for book loading
          const book = rendition.book;
          if (book) {
            book.ready.then(() => {
              console.log("✅ Book ready");

              // Generate locations for navigation
              return book.locations.generate(1024);
            }).then(async () => {
              console.log("✅ Locations generated");

              // In scroll mode, pre-load ALL spine items to prevent lazy loading flickering
              if (effectiveReadingMode === 'scrolled') {
                console.log("📚 Pre-loading all sections for scroll mode...");
                const spine = book.spine as any;
                const spineItems = spine.spineItems || spine.items || [];
                if (spineItems.length > 0) {
                  // Load all spine items to prevent lazy loading
                  for (const item of spineItems) {
                    try {
                      await item.load(book.load.bind(book));
                    } catch (e) {
                      console.warn("Failed to preload section:", e);
                    }
                  }
                  console.log("✅ All sections pre-loaded");
                }
              }

              // Mark book as ready
              setBookReady(true);

              // Notify parent that locations are ready for progress calculation
              if (onLocationsReady) {
                onLocationsReady();
              }

              // Validate and apply the initial location CFI if present
              if (initialLocation && typeof initialLocation === 'string') {
                console.log("🔍 Validating saved location CFI:", initialLocation);

                try {
                  // Try to get the spine item for this CFI
                  // If the CFI is invalid, this will throw an error
                  const spineItem = book.spine.get(initialLocation);

                  if (!spineItem) {
                    throw new Error("CFI does not resolve to a valid spine item");
                  }

                  console.log("✅ Saved location CFI is valid, navigating directly via rendition.display()");

                  // Use rendition.display() directly instead of setLocation to avoid ReactReader issues
                  initialLocationSetRef.current = true;

                  try {
                    await rendition.display(initialLocation);
                    console.log("✅ Successfully navigated to saved location");
                  } catch (displayError) {
                    console.warn("⚠️ Failed to display saved location:", displayError);
                    // Fall through to display from start
                    try {
                      await rendition.display();
                    } catch (e) {
                      console.error("Failed to display from start:", e);
                    }
                  }

                  // Skip the "no initial location" logic below since we have one
                  return;
                } catch (validationError) {
                  console.warn("⚠️ Saved location CFI is invalid:", validationError);
                  console.log("📍 Clearing invalid CFI and starting from beginning");

                  // Mark that we had an error
                  hasNavigationErrorRef.current = true;

                  // Don't set location - leave it undefined and fall through to display from start
                }
              }

              // If no initial location or validation failed, go to the start of the book content
              console.log("📍 No valid initial location, navigating to start");
              try {
                // Display the first chapter/section
                rendition.display();
              } catch (err) {
                console.error("Failed to display book:", err);
              }

              // Apply annotations after book is ready
              setTimeout(() => {
                applyAnnotations();
              }, 200);
            }).catch((err: any) => {
              console.error("❌ Book ready error:", err);
              setError(`Erreur lors du chargement du livre: ${err.message || err}`);
            });
          }

          injectStyles(rendition);

          // Force remove margins from rendition manager container for scroll mode
          if (effectiveReadingMode === 'scrolled') {
            // Access the manager container and remove margins
            setTimeout(() => {
              const manager = (rendition as any).manager;
              if (manager?.container) {
                manager.container.style.margin = '0';
                manager.container.style.padding = '0 16px';
                manager.container.style.width = '100%';
                manager.container.style.maxWidth = '100%';
                manager.container.style.boxSizing = 'border-box';
                manager.container.style.left = '0';
                manager.container.style.right = '0';
              }
              // Also try to access the stage/view container
              const stage = manager?.stage?.container || manager?.container?.querySelector('.epub-container');
              if (stage) {
                stage.style.margin = '0';
                stage.style.padding = '0';
                stage.style.width = '100%';
                stage.style.maxWidth = '100%';
              }
              // Target any epub-view iframes
              const iframes = manager?.container?.querySelectorAll('iframe');
              if (iframes) {
                iframes.forEach((iframe: HTMLIFrameElement) => {
                  iframe.style.width = '100%';
                  iframe.style.maxWidth = '100%';
                  iframe.style.margin = '0';
                  iframe.style.left = '0';
                });
              }
            }, 100);
          }

          // Appliquer les paramètres initiaux si disponibles
          if (readerSettings) {
            const fontSize = readerSettings.fontSize || 16;
            const lineHeight = readerSettings.lineHeight || 150;
            const fontFamily = readerSettings.fontFamily || 'system-ui';
            const readerTheme = readerSettings.theme || 'light';

            let textColor = '#000';
            let bgColor = '#fff';
            if (readerTheme === 'dark') {
              textColor = '#fff';
              bgColor = '#000000'; // pure black
            } else if (readerTheme === 'sepia') {
              textColor = '#5c4a3a';
              bgColor = '#f4ecd8';
            }

            rendition.themes.override('color', textColor);
            rendition.themes.override('background', bgColor);
            rendition.themes.override('font-family', fontFamily);
            rendition.themes.override('font-size', `${fontSize}px`);
            rendition.themes.override('line-height', `${lineHeight / 100}`);
          }

          // Force remove margins/padding for scroll mode
          if (effectiveReadingMode === 'scrolled') {
            rendition.themes.override('margin', '0');
            rendition.themes.override('padding', '0 16px');
            rendition.themes.override('max-width', '100%');
            rendition.themes.override('width', '100%');
          }

          // Error handling
          rendition.on('relocated', (location: any) => {
            console.log("📍 Location changed:", location);
          });

          rendition.on('rendered', (section: any) => {
            console.log("📄 Page rendered, section:", section?.index);
            handleRendered();

            // Setup MutationObserver-based scroll anchoring for continuous scroll mode
            // This monitors DOM changes in real-time and adjusts scroll position
            if (effectiveReadingMode === 'scrolled') {
              setTimeout(() => {
                const manager = (rendition as any).manager;
                const container = manager?.container;

                if (container && !mutationObserverRef.current) {
                  // Save reference for cleanup
                  scrollContainerRef.current = container;
                  lastScrollHeightRef.current = container.scrollHeight;

                  // Create MutationObserver to detect content changes
                  const observer = new MutationObserver((mutations) => {
                    const newScrollHeight = container.scrollHeight;
                    const heightDiff = newScrollHeight - lastScrollHeightRef.current;

                    // If content was added and we're near the top, adjust scroll
                    if (heightDiff > 0 && isNearTopRef.current) {
                      // Content was prepended - adjust scroll to maintain position
                      const currentScrollTop = container.scrollTop;
                      const newScrollTop = currentScrollTop + heightDiff;
                      console.log("🔧 MutationObserver: content prepended, adjusting scroll by", heightDiff, "px");
                      container.scrollTop = newScrollTop;

                      // Hide loading indicator
                      setLoadingPrevious(false);
                      loadingPreviousRef.current = false;
                      isNearTopRef.current = false;
                    }

                    // Update tracked height
                    lastScrollHeightRef.current = newScrollHeight;
                  });

                  observer.observe(container, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                    characterData: false
                  });

                  mutationObserverRef.current = observer;
                  console.log("✅ MutationObserver set up for scroll anchoring");
                }
              }, 100);
            }

            // Setup scroll direction detection for header hide/show
            if (onScrollDirectionChange || effectiveReadingMode === 'scrolled') {
              // Try to find the scroll container (manager container or iframe)
              setTimeout(() => {
                const manager = (rendition as any).manager;
                const container = manager?.container;

                if (container) {
                  const handleScroll = () => {
                    const currentScrollY = container.scrollTop;
                    const scrollDelta = currentScrollY - lastScrollY.current;

                    // Only trigger if we scrolled more than 10px to avoid micro-movements
                    if (Math.abs(scrollDelta) > 10) {
                      const direction = scrollDelta > 0 ? 'down' : 'up';

                      // Only call callback if direction changed
                      if (direction !== lastScrollDirection.current) {
                        lastScrollDirection.current = direction;
                        if (onScrollDirectionChange) {
                          onScrollDirectionChange(direction);
                        }
                      }

                      lastScrollY.current = currentScrollY;
                    }

                    // Detect when we're near the top for scroll anchoring
                    if (effectiveReadingMode === 'scrolled') {
                      const wasNearTop = isNearTopRef.current;
                      isNearTopRef.current = currentScrollY < 150;

                      // Show loading indicator when entering the "near top" zone
                      if (isNearTopRef.current && !wasNearTop && !loadingPreviousRef.current) {
                        try {
                          const currentLocation = rendition.currentLocation() as any;
                          const book = rendition.book;
                          // Check if we're past the first chapter AND not at the very beginning of the book
                          const isFirstChapter = currentLocation?.start?.index === 0;
                          const percentage = book?.locations?.percentageFromCfi?.(currentLocation?.start?.cfi);
                          const isAtVeryStart = percentage !== undefined && percentage < 0.02; // Less than 2%
                          
                          if (currentLocation && currentLocation.start && !isFirstChapter && !isAtVeryStart) {
                            console.log("⬆️ Near top of scroll, preparing for previous chapter");
                            setLoadingPrevious(true);
                            loadingPreviousRef.current = true;
                          }
                        } catch (e) {
                          // Ignore location errors
                        }
                      }

                      // Hide loading when moving away from top
                      if (!isNearTopRef.current && loadingPreviousRef.current) {
                        console.log("⬇️ Moved away from top, hiding loading");
                        setLoadingPrevious(false);
                        loadingPreviousRef.current = false;
                      }
                    }
                  };

                  // Remove old listener if exists and add new one
                  container.removeEventListener('scroll', handleScroll);
                  container.addEventListener('scroll', handleScroll, { passive: true });
                }
              }, 100);
            }
          });

          rendition.on('relocated', handleRendered);

          // Handle errors
          rendition.on('error', (err: any) => {
            console.error("❌ Rendition error:", err);

            // Check if this is a "No Section Found" error (invalid CFI)
            const errorMessage = err?.message || String(err);
            if (errorMessage.includes('No Section Found')) {
              console.warn("⚠️ Invalid CFI location detected, clearing and restarting from beginning");

              // Mark that we've had a navigation error to prevent retry loops
              hasNavigationErrorRef.current = true;

              // Clear the invalid location state
              setLocation(undefined);

              // Navigate to the start of the book
              setTimeout(() => {
                try {
                  rendition.display();
                } catch (displayErr) {
                  console.error("Failed to display book from start:", displayErr);
                }
              }, 100);

              // Don't show error UI for this specific case
              return;
            }

            // For other errors, show the error UI
            setError(`Erreur de rendu: ${errorMessage}`);
          });

          // Prevent navigation when selecting text, and detect center tap for fullscreen toggle
          rendition.on('click', (e: any) => {
            const selection = e.view.document.getSelection();
            if (selection && selection.toString().length > 0) {
              e.stopPropagation();
              e.preventDefault();
              return;
            }

            // Detect center tap for fullscreen toggle (only in paginated mode)
            if (onCenterTap && effectiveReadingMode === 'paginated') {
              const renditionAny = rendition as any;
              const iframe = renditionAny.manager?.container?.querySelector('iframe');
              if (iframe) {
                const rect = iframe.getBoundingClientRect();
                const clickX = e.clientX;
                const clickY = e.clientY;

                // Define center zone as middle 60% horizontally and middle 80% vertically
                const leftBound = rect.left + rect.width * 0.2;
                const rightBound = rect.left + rect.width * 0.8;
                const topBound = rect.top + rect.height * 0.1;
                const bottomBound = rect.top + rect.height * 0.9;

                if (clickX >= leftBound && clickX <= rightBound &&
                  clickY >= topBound && clickY <= bottomBound) {
                  onCenterTap();
                }
              }
            }
          });

          // Text selection handler
          rendition.on('selected', (cfiRange: string, contents: any) => {
            const selection = contents.window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const range = selection.getRangeAt(0);
            const text = selection.toString();

            if (text && text.trim().length > 0) {
              const rect = range.getBoundingClientRect();
              const renditionAny = rendition as any;
              const iframe = renditionAny.manager?.container?.querySelector('iframe');
              let xOffset = 0, yOffset = 0;
              if (iframe) {
                const r = iframe.getBoundingClientRect();
                xOffset = r.left;
                yOffset = r.top;
              }

              const absoluteRect = new DOMRect(
                rect.left + xOffset,
                rect.top + yOffset,
                rect.width,
                rect.height
              );

              if (onTextSelect) {
                onTextSelect(cfiRange, text.trim(), absoluteRect);
              }
            }
          });
        }}
        swipeable={false}
        showToc={false}
        epubOptions={{
          allowPopups: true,
          allowScriptedContent: true,
          flow: effectiveReadingMode === 'scrolled' ? 'scrolled-doc' : 'paginated',
          manager: effectiveReadingMode === 'scrolled' ? 'continuous' : 'default',
          snap: effectiveReadingMode !== 'scrolled',
          // On scroll mode or mobile: single page. On desktop paginated: 2-page spread
          spread: (effectiveReadingMode === 'scrolled' || isMobile) ? 'none' : 'auto',
          // Remove margins in scroll mode
          ...(effectiveReadingMode === 'scrolled' ? {
            width: '100%',
            minSpreadWidth: 9999, // Force single column
          } : {}),
        }}
      />
    </div>
  );
}

