/**
 * Help Content Index
 * Central export for all help content
 */

import { dashboardHelp } from './dashboardHelp';
import { gettingStartedHelp } from './gettingStartedHelp';
import { PageHelpContent } from '../../types/help';

// Export individual help content
export { dashboardHelp } from './dashboardHelp';
export { gettingStartedHelp } from './gettingStartedHelp';

// Combined help content for global search
export const allHelpContent: PageHelpContent[] = [
  gettingStartedHelp,
  dashboardHelp
];

// Helper function to search across all help content
export const searchAllHelp = (query: string) => {
  const results: Array<{ article: any; page: string }> = [];
  const lowerQuery = query.toLowerCase();
  
  allHelpContent.forEach(pageContent => {
    pageContent.articles.forEach(article => {
      const matchesTitle = article.title.toLowerCase().includes(lowerQuery);
      const matchesContent = article.content.toLowerCase().includes(lowerQuery);
      const matchesTags = article.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      
      if (matchesTitle || matchesContent || matchesTags) {
        results.push({
          article,
          page: pageContent.pageName
        });
      }
    });
  });
  
  return results;
};

// Get help content by page ID
export const getHelpByPageId = (pageId: string): PageHelpContent | undefined => {
  return allHelpContent.find(content => content.pageId === pageId);
};

// Get article by ID across all pages
export const getArticleById = (articleId: string) => {
  for (const pageContent of allHelpContent) {
    const article = pageContent.articles.find(a => a.id === articleId);
    if (article) {
      return { article, page: pageContent.pageName };
    }
  }
  return null;
};
