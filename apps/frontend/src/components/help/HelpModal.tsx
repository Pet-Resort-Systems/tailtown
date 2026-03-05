/**
 * HelpModal Component
 * Full-featured help modal with search, categories, and video support
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Divider,
  Tabs,
  Tab,
  Paper,
  Breadcrumbs,
  Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { HelpArticle, HelpCategory, PageHelpContent } from '../../types/help';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  pageContent?: PageHelpContent;
  initialArticleId?: string;
}

const HelpModal: React.FC<HelpModalProps> = ({
  open,
  onClose,
  pageContent,
  initialArticleId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | 'all'>('all');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'article'>('list');

  // Initialize with article if provided
  React.useEffect(() => {
    if (initialArticleId && pageContent) {
      const article = pageContent.articles.find(a => a.id === initialArticleId);
      if (article) {
        setSelectedArticle(article);
        setViewMode('article');
      }
    }
  }, [initialArticleId, pageContent]);

  const categories: Array<{ value: HelpCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All Topics' },
    { value: 'getting-started', label: 'Getting Started' },
    { value: 'reservations', label: 'Reservations' },
    { value: 'customers', label: 'Customers' },
    { value: 'pets', label: 'Pets' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'reports', label: 'Reports' },
    { value: 'billing', label: 'Billing' },
    { value: 'staff', label: 'Staff' },
    { value: 'admin', label: 'Admin' }
  ];

  // Filter articles based on search and category
  const filteredArticles = useMemo(() => {
    if (!pageContent) return [];

    let articles = pageContent.articles;

    // Filter by category
    if (selectedCategory !== 'all') {
      articles = articles.filter(a => a.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query) ||
        a.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return articles;
  }, [pageContent, selectedCategory, searchQuery]);

  const handleArticleClick = (article: HelpArticle) => {
    setSelectedArticle(article);
    setViewMode('article');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedArticle(null);
  };

  const handleClose = () => {
    setViewMode('list');
    setSelectedArticle(null);
    setSearchQuery('');
    setSelectedCategory('all');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">
            {viewMode === 'list' ? 'Help Center' : 'Help Article'}
          </Typography>
          {pageContent && (
            <Chip 
              label={pageContent.pageName} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          )}
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {viewMode === 'list' ? (
          <Box>
            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Category Tabs */}
            <Tabs
              value={selectedCategory}
              onChange={(_, value) => setSelectedCategory(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              {categories.map(cat => (
                <Tab key={cat.value} label={cat.label} value={cat.value} />
              ))}
            </Tabs>

            {/* Page Overview */}
            {pageContent && !searchQuery && selectedCategory === 'all' && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  About This Page
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {pageContent.overview}
                </Typography>
              </Paper>
            )}

            {/* Articles List */}
            {filteredArticles.length > 0 ? (
              <List>
                {filteredArticles.map((article, index) => (
                  <React.Fragment key={article.id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => handleArticleClick(article)}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {article.title}
                              {article.videoUrl && (
                                <PlayCircleOutlineIcon fontSize="small" color="primary" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {article.content.substring(0, 150)}...
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {article.tags.map(tag => (
                                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                                ))}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {searchQuery ? 'No articles found matching your search.' : 'No articles available in this category.'}
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={handleBackToList}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <HomeIcon fontSize="small" />
                Help Center
              </Link>
              <Typography variant="body2" color="text.primary">
                {selectedArticle?.title}
              </Typography>
            </Breadcrumbs>

            {/* Article Content */}
            {selectedArticle && (
              <Box>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  {selectedArticle.title}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={selectedArticle.category} size="small" color="primary" />
                  {selectedArticle.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>

                {/* Video Player (if available) */}
                {selectedArticle.videoUrl && (
                  <Paper sx={{ mb: 3, p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PlayCircleOutlineIcon color="primary" />
                      Video Tutorial
                    </Typography>
                    <Box
                      sx={{
                        position: 'relative',
                        paddingBottom: '56.25%', // 16:9 aspect ratio
                        height: 0,
                        overflow: 'hidden',
                        borderRadius: 1
                      }}
                    >
                      <iframe
                        src={selectedArticle.videoUrl}
                        title={selectedArticle.title}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 'none'
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </Box>
                  </Paper>
                )}

                {/* Article Text */}
                <Typography 
                  variant="body1" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.7
                  }}
                >
                  {selectedArticle.content}
                </Typography>

                {/* Related Articles */}
                {selectedArticle.relatedArticles && selectedArticle.relatedArticles.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      Related Articles
                    </Typography>
                    <List>
                      {selectedArticle.relatedArticles.map(relatedId => {
                        const related = pageContent?.articles.find(a => a.id === relatedId);
                        if (!related) return null;
                        return (
                          <ListItem key={relatedId} disablePadding>
                            <ListItemButton onClick={() => handleArticleClick(related)}>
                              <ListItemText primary={related.title} />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;
