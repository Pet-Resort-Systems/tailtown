import api from './api';
import { Announcement } from '../components/announcements/AnnouncementModal';

interface AnnouncementResponse {
  success: boolean;
  data: Announcement[];
  error?: string;
}

interface SingleAnnouncementResponse {
  success: boolean;
  data: Announcement;
  error?: string;
}

/**
 * Get active announcements for the current user
 * Returns only announcements that haven't been dismissed
 */
export const getActiveAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const response = await api.get<AnnouncementResponse>('/api/announcements');
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    return [];
  }
};

/**
 * Get all announcements (admin view)
 */
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const response = await api.get<AnnouncementResponse>('/api/announcements/all');
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    return [];
  }
};

/**
 * Create a new announcement
 */
export const createAnnouncement = async (data: Partial<Announcement>): Promise<Announcement> => {
  const response = await api.post<SingleAnnouncementResponse>('/api/announcements', data);
  return response.data.data;
};

/**
 * Update an announcement
 */
export const updateAnnouncement = async (id: string, data: Partial<Announcement>): Promise<Announcement> => {
  const response = await api.put<SingleAnnouncementResponse>(`/api/announcements/${id}`, data);
  return response.data.data;
};

/**
 * Delete an announcement
 */
export const deleteAnnouncement = async (id: string): Promise<void> => {
  await api.delete(`/api/announcements/${id}`);
};

/**
 * Dismiss an announcement for the current user
 */
export const dismissAnnouncement = async (id: string): Promise<void> => {
  await api.post(`/api/announcements/${id}/dismiss`);
};

export default {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  dismissAnnouncement
};
