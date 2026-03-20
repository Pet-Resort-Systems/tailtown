/**
 * Report Card Viewer
 *
 * Customer-facing component for viewing pet report cards
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Rating,
  Chip,
  ImageList,
  ImageListItem,
  Button,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  IconButton,
} from '@mui/material';
import { Download, Share, Close } from '@mui/icons-material';
import {
  reportCardService,
  ReportCard,
} from '../../services/reportCardService';
import { format } from 'date-fns';

interface ReportCardViewerProps {
  reportCardId: string;
  onClose?: () => void;
}

const ReportCardViewer: React.FC<ReportCardViewerProps> = ({
  reportCardId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadReportCard();
  }, [reportCardId]);

  const loadReportCard = async () => {
    try {
      setLoading(true);
      const data = await reportCardService.getReportCard(reportCardId);
      setReportCard(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report card');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPhotos = () => {
    // TODO: Implement photo download
    alert('Download photos feature coming soon!');
  };

  const handleShare = () => {
    // TODO: Implement sharing
    if (navigator.share) {
      navigator.share({
        title: reportCard?.title || 'Pet Report Card',
        text: reportCard?.summary || '',
        url: window.location.href,
      });
    } else {
      alert('Share feature not supported on this device');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !reportCard) {
    return <Alert severity="error">{error || 'Report card not found'}</Alert>;
  }

  return (
    <Box>
      <Card>
        <CardContent>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h4" gutterBottom>
                🐾 {reportCard.pet?.name}'s Report Card
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(new Date(reportCard.reportDate), 'MMMM dd, yyyy')}
              </Typography>
              <Chip
                label={reportCardService.formatServiceType(
                  reportCard.serviceType
                )}
                size="small"
                color="primary"
                sx={{ mt: 1 }}
              />
            </Box>
            {onClose && (
              <IconButton onClick={onClose}>
                <Close />
              </IconButton>
            )}
          </Box>

          {/* Photo Gallery */}
          {reportCard.photos && reportCard.photos.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Photo Gallery ({reportCard.photoCount})
              </Typography>
              <ImageList cols={3} gap={8} sx={{ mb: 2 }}>
                {reportCard.photos.map((photo) => (
                  <ImageListItem
                    key={photo.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedPhoto(photo.url)}
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.caption || 'Pet photo'}
                      loading="lazy"
                      style={{
                        height: 200,
                        objectFit: 'cover',
                        borderRadius: 8,
                      }}
                    />
                    {photo.caption && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          p: 1,
                        }}
                      >
                        <Typography variant="caption">
                          {photo.caption}
                        </Typography>
                      </Box>
                    )}
                  </ImageListItem>
                ))}
              </ImageList>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleDownloadPhotos}
                  size="small"
                >
                  Download Photos
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={handleShare}
                  size="small"
                >
                  Share
                </Button>
              </Stack>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Summary */}
          {reportCard.summary && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Summary
              </Typography>
              <Typography variant="body1" paragraph>
                {reportCard.summary}
              </Typography>
            </Box>
          )}

          {/* Ratings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              How was their day?
            </Typography>
            <Stack spacing={2}>
              {reportCard.moodRating && (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Mood{' '}
                    {reportCardService.getRatingEmoji(reportCard.moodRating)}
                  </Typography>
                  <Rating value={reportCard.moodRating} readOnly size="large" />
                </Box>
              )}
              {reportCard.energyRating && (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Energy Level ⚡
                  </Typography>
                  <Rating
                    value={reportCard.energyRating}
                    readOnly
                    size="large"
                  />
                </Box>
              )}
              {reportCard.appetiteRating && (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Appetite 🍖
                  </Typography>
                  <Rating
                    value={reportCard.appetiteRating}
                    readOnly
                    size="large"
                  />
                </Box>
              )}
              {reportCard.socialRating && (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Social Behavior 👥
                  </Typography>
                  <Rating
                    value={reportCard.socialRating}
                    readOnly
                    size="large"
                  />
                </Box>
              )}
            </Stack>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Activities */}
          {reportCard.activities && reportCard.activities.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Activities Today
              </Typography>
              <Stack spacing={1}>
                {reportCard.activities.map((activity, index) => (
                  <Box
                    key={index}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Typography variant="body1">✓ {activity}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Meals */}
          {reportCard.mealsEaten && reportCard.mealsEaten.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Meals
              </Typography>
              <Stack spacing={1}>
                {reportCard.mealsEaten.map((meal, index) => (
                  <Typography key={index} variant="body1">
                    🍖 {meal}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}

          {/* Highlights */}
          {reportCard.highlights && reportCard.highlights.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Highlights ⭐
              </Typography>
              <Stack spacing={1}>
                {reportCard.highlights.map((highlight, index) => (
                  <Chip
                    key={index}
                    label={highlight}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Behavioral Notes */}
          {reportCard.behaviorNotes && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Staff Notes
              </Typography>
              <Box
                sx={{
                  bgcolor: 'background.default',
                  p: 2,
                  borderRadius: 1,
                  borderLeft: 4,
                  borderColor: 'primary.main',
                }}
              >
                <Typography variant="body1">
                  {reportCard.behaviorNotes}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Concerns */}
          {reportCard.concerns && reportCard.concerns.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Alert severity="warning">
                <Typography variant="subtitle2" gutterBottom>
                  Notes for Parents
                </Typography>
                <Stack spacing={1}>
                  {reportCard.concerns.map((concern, index) => (
                    <Typography key={index} variant="body2">
                      • {concern}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            </Box>
          )}

          {/* Medication */}
          {reportCard.medicationGiven && (
            <Box sx={{ mb: 3 }}>
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  Medication Administered
                </Typography>
                {reportCard.medicationNotes && (
                  <Typography variant="body2">
                    {reportCard.medicationNotes}
                  </Typography>
                )}
              </Alert>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Footer */}
          <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              Report created by {reportCard.createdByStaff?.firstName}{' '}
              {reportCard.createdByStaff?.lastName}
            </Typography>
            <Typography variant="caption">
              We loved having {reportCard.pet?.name} with us! Looking forward to
              next time. 💙
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Photo Zoom Dialog */}
      <Dialog
        open={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        maxWidth="lg"
        fullWidth
      >
        <IconButton
          onClick={() => setSelectedPhoto(null)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            bgcolor: 'background.paper',
          }}
        >
          <Close />
        </IconButton>
        {selectedPhoto && (
          <img
            src={selectedPhoto}
            alt="Full size"
            style={{ width: '100%', height: 'auto' }}
          />
        )}
      </Dialog>
    </Box>
  );
};

export default ReportCardViewer;
