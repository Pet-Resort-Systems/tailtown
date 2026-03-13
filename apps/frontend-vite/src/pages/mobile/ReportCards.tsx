/**
 * Mobile Report Cards Page
 * 
 * Mobile-optimized page for creating and managing pet report cards
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Fab,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Pets as PetIcon,
  PhotoCamera as PhotoIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { BottomNav } from '../../components/mobile/BottomNav';
import QuickReportCard from '../../components/reportCards/QuickReportCard';
import { reportCardService, ReportCard } from '../../services/reportCardService';
import { useAuth } from '../../contexts/AuthContext';

const ReportCards: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [todaysPets, setTodaysPets] = useState<any[]>([]);

  useEffect(() => {
    loadReportCards();
    loadTodaysPets();
  }, []);

  const loadReportCards = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const result = await reportCardService.listReportCards({
        startDate: today.toISOString(),
        limit: 50
      });
      
      setReportCards(result.reportCards);
    } catch (err: any) {
      setError(err.message || 'Failed to load report cards');
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysPets = async () => {
    try {
      // TODO: Load today's checked-in pets from reservations
      // For now, mock data
      setTodaysPets([
        { id: 'pet-1', name: 'Max', hasReport: false },
        { id: 'pet-2', name: 'Bella', hasReport: false },
        { id: 'pet-3', name: 'Charlie', hasReport: true }
      ]);
    } catch (err) {
      console.error('Failed to load pets:', err);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    loadReportCards();
    loadTodaysPets();
  };

  const petsWithoutReports = todaysPets.filter(p => !p.hasReport).length;

  if (showCreateForm) {
    return (
      <Box>
        <MobileHeader
          title="Create Report Card"
          showBack
          onBack={() => setShowCreateForm(false)}
        />
        <Box sx={{ p: 2, pb: 10 }}>
          <QuickReportCard
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </Box>
        <BottomNav />
      </Box>
    );
  }

  return (
    <Box>
      <MobileHeader
        title="Report Cards"
        showNotifications
        userName={user?.firstName}
      />

      <Box sx={{ p: 2, pb: 10 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Quick Stats */}
        <Card sx={{ mb: 2, bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {reportCards.length}
                </Typography>
                <Typography variant="body2">
                  Reports Today
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" fontWeight="bold">
                  {petsWithoutReports}
                </Typography>
                <Typography variant="body2">
                  Pets Waiting
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Pets Without Reports */}
        {petsWithoutReports > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Pets Needing Reports
                </Typography>
                <Chip
                  label={petsWithoutReports}
                  color="warning"
                  size="small"
                />
              </Box>
              <List dense>
                {todaysPets.filter(p => !p.hasReport).map((pet) => (
                  <ListItem
                    key={pet.id}
                    button
                    onClick={() => setShowCreateForm(true)}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <PetIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={pet.name}
                      secondary="No report yet"
                    />
                    <PhotoIcon color="action" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Today's Reports */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Today's Reports
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : reportCards.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <PhotoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Reports Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create your first report card for today's pets
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateForm(true)}
              >
                Create Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <List>
            {reportCards.map((report) => (
              <Card key={report.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>
                        <PetIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {report.pet?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {report.customer?.firstName} {report.customer?.lastName}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={reportCardService.formatStatus(report.status)}
                      color={reportCardService.getStatusColor(report.status)}
                      size="small"
                    />
                  </Box>

                  {report.summary && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {report.summary}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    {report.moodRating && (
                      <Chip
                        label={`Mood ${reportCardService.getRatingEmoji(report.moodRating)}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    <Badge badgeContent={report.photoCount} color="primary">
                      <PhotoIcon color="action" />
                    </Badge>
                  </Box>

                  {report.status === 'DRAFT' && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<SendIcon />}
                      size="small"
                      onClick={async () => {
                        try {
                          await reportCardService.sendReportCard(report.id, {
                            sendEmail: true,
                            sendSMS: true
                          });
                          loadReportCards();
                        } catch (err: any) {
                          setError(err.message);
                        }
                      }}
                    >
                      Send to Parent
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16
        }}
        onClick={() => setShowCreateForm(true)}
      >
        <AddIcon />
      </Fab>

      <BottomNav />
    </Box>
  );
};

export default ReportCards;
