/**
 * Getting Started Page
 * Displays comprehensive getting started guide for new users
 */

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip
} from '@mui/material';
import { usePageHelp } from '../../hooks/usePageHelp';
import { gettingStartedHelp } from '../../content/help/gettingStartedHelp';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

const GettingStarted: React.FC = () => {
  
  // Set page help content
  usePageHelp(gettingStartedHelp);

  const handleArticleClick = (articleId: string) => {
    // Open help modal with specific article
    // This would integrate with your HelpContext
    console.log('Open article:', articleId);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlineIcon fontSize="large" color="primary" />
          Getting Started with Tailtown
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {gettingStartedHelp.overview}
        </Typography>
      </Box>

      {/* Quick Start Cards */}
      <Grid container spacing={3}>
        {gettingStartedHelp.articles.map((article) => (
          <Grid item xs={12} sm={6} md={4} key={article.id}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardActionArea 
                onClick={() => handleArticleClick(article.id)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
                      {article.title}
                    </Typography>
                    {article.videoUrl && (
                      <PlayCircleOutlineIcon color="primary" />
                    )}
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {article.content.substring(0, 150)}...
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {article.tags.slice(0, 3).map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Resources */}
      <Paper sx={{ mt: 4, p: 3, bgcolor: 'primary.50' }}>
        <Typography variant="h6" gutterBottom>
          Need More Help?
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Can't find what you're looking for? We're here to help!
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label="Email: support@tailtown.com" 
            variant="outlined"
            clickable
          />
          <Chip 
            label="Phone: 1-800-TAILTOWN" 
            variant="outlined"
            clickable
          />
          <Chip 
            label="Live Chat" 
            variant="outlined"
            color="primary"
            clickable
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default GettingStarted;
