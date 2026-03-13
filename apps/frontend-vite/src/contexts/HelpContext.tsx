/**
 * Help Context
 * Provides page-specific help content throughout the application
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { PageHelpContent } from '../types/help';
import HelpModal from '../components/help/HelpModal';
import { allHelpContent } from '../content/help';

interface HelpContextType {
  openHelp: (articleId?: string) => void;
  closeHelp: () => void;
  setPageContent: (content: PageHelpContent) => void;
  pageContent: PageHelpContent | undefined;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within HelpProvider');
  }
  return context;
};

interface HelpProviderProps {
  children: React.ReactNode;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children }) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const [pageContent, setPageContent] = useState<PageHelpContent | undefined>();
  const [initialArticleId, setInitialArticleId] = useState<string | undefined>();

  const openHelp = useCallback((articleId?: string) => {
    setInitialArticleId(articleId);
    setHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    setInitialArticleId(undefined);
  }, []);

  // Combine page-specific content with all help content
  const combinedContent = useMemo(() => {
    if (pageContent) {
      return pageContent;
    }
    
    // If no page-specific content, show all help content
    return {
      pageId: 'all',
      pageName: 'Help Center',
      overview: 'Browse all help articles and guides to learn how to use Tailtown effectively.',
      articles: allHelpContent.flatMap(content => content.articles),
      tooltips: {}
    };
  }, [pageContent]);

  return (
    <HelpContext.Provider
      value={{
        openHelp,
        closeHelp,
        setPageContent,
        pageContent
      }}
    >
      {children}
      <HelpModal
        open={helpOpen}
        onClose={closeHelp}
        pageContent={combinedContent}
        initialArticleId={initialArticleId}
      />
    </HelpContext.Provider>
  );
};
