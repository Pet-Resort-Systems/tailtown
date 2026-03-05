/**
 * Help System Types
 * Defines the structure for contextual help content
 */

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: HelpCategory;
  tags: string[];
  videoUrl?: string; // Future: YouTube or Vimeo URL
  relatedArticles?: string[]; // IDs of related articles
}

export interface HelpTooltipContent {
  id: string;
  title: string;
  description: string;
  learnMoreArticleId?: string; // Link to full article in modal
}

export interface PageHelpContent {
  pageId: string;
  pageName: string;
  overview: string;
  articles: HelpArticle[];
  tooltips: Record<string, HelpTooltipContent>; // Key is element ID
  quickActions?: QuickAction[];
}

export interface QuickAction {
  label: string;
  description: string;
  action: () => void;
}

export type HelpCategory = 
  | 'getting-started'
  | 'reservations'
  | 'customers'
  | 'pets'
  | 'calendar'
  | 'reports'
  | 'settings'
  | 'billing'
  | 'staff'
  | 'admin';

export interface HelpSearchResult {
  article: HelpArticle;
  matchScore: number;
  matchedText: string;
}
