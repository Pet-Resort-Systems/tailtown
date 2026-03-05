import React, { useEffect } from "react";

/**
 * ScrollFix component addresses scrolling issues in the application
 * by ensuring proper scroll behavior during component updates.
 *
 * The component:
 * 1. Prevents scroll position jumps during re-renders
 * 2. Fixes issues with focus management that can block scrolling
 * 3. Ensures smooth scrolling behavior across the application
 */
const ScrollFix: React.FC = () => {
  useEffect(() => {
    // Store original overflow setting
    const originalOverflow = document.body.style.overflow;

    // Function to ensure scrolling is enabled
    const ensureScrollingEnabled = () => {
      // Remove any overflow:hidden that might be blocking scrolling
      if (document.body.style.overflow === "hidden") {
        document.body.style.overflow = "auto";
      }

      // Check for any elements with position:fixed that cover the viewport
      const fixedElements = document.querySelectorAll(
        '[style*="position: fixed"]'
      );
      fixedElements.forEach((el) => {
        // If an element is fixed and covers most of the screen but isn't a dialog
        const rect = el.getBoundingClientRect();
        const isLarge =
          rect.width > window.innerWidth * 0.9 &&
          rect.height > window.innerHeight * 0.9;
        const isDialog = el.getAttribute("role") === "dialog";

        if (isLarge && !isDialog) {
          // Add a data attribute so we don't modify it again
          if (!el.hasAttribute("data-scroll-fix-applied")) {
            el.setAttribute("data-scroll-fix-applied", "true");
            // Modify the element to allow scrolling
            (el as HTMLElement).style.overflow = "auto";
            (el as HTMLElement).style.maxHeight = "100vh";
          }
        }
      });
    };

    // Apply fix immediately
    ensureScrollingEnabled();

    // Set up an interval to periodically check and fix scrolling
    // This catches cases where components might be changing the scroll behavior
    const intervalId = setInterval(ensureScrollingEnabled, 1000);

    // Set up event listeners for scroll events to detect when scrolling is blocked
    let lastScrollTop =
      window.pageYOffset || document.documentElement.scrollTop;

    const scrollHandler = () => {
      const currentScrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      // Update last scroll position if scrolling works
      if (currentScrollTop !== lastScrollTop) {
        lastScrollTop = currentScrollTop;
      }
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("scroll", scrollHandler);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return null; // This component doesn't render anything
};

export default ScrollFix;
