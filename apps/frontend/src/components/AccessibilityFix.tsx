import React, { useEffect } from 'react';

/**
 * This component fixes the accessibility issue with Material UI dialogs
 * where aria-hidden="true" is applied to the root element but descendant elements
 * retain focus, causing accessibility warnings.
 * 
 * The fix works by removing the aria-hidden attribute from the root element
 * when the component mounts and setting up a mutation observer to prevent
 * it from being added again.
 */
const AccessibilityFix: React.FC = () => {
  useEffect(() => {
    // Function to remove aria-hidden from root element
    const removeAriaHidden = () => {
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement.hasAttribute('aria-hidden')) {
        rootElement.removeAttribute('aria-hidden');
      }
    };

    // Remove aria-hidden initially
    removeAriaHidden();

    // Set up a mutation observer to watch for changes to the root element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'aria-hidden'
        ) {
          removeAriaHidden();
        }
      });
    });

    // Start observing the root element
    const rootElement = document.getElementById('root');
    if (rootElement) {
      observer.observe(rootElement, { attributes: true });
    }

    // Cleanup function
    return () => {
      observer.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
};

export default AccessibilityFix;
