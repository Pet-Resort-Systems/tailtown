/**
 * usePageHelp Hook
 * Easily set page-specific help content
 */

import { useEffect } from 'react';
import { useHelp } from '../contexts/HelpContext';
import { PageHelpContent } from '../types/help';

/**
 * Set help content for the current page
 * @param content Page help content
 */
export const usePageHelp = (content: PageHelpContent) => {
  const { setPageContent } = useHelp();

  useEffect(() => {
    setPageContent(content);

    // Cleanup: clear page content when component unmounts
    return () => {
      setPageContent(undefined as any);
    };
  }, [content, setPageContent]);
};
