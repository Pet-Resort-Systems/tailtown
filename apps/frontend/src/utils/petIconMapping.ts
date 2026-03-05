/**
 * Pet Icon Mapping
 * Maps pet icon IDs to emoji characters for display
 */

export const PET_ICON_MAP: Record<string, string> = {
  // Medical Icons
  'allergies': '⚠️',
  'medication': '💊',
  'special-needs': '⚕️',
  'senior': '👴',
  'puppy': '🐶',
  'kitten': '🐱',
  'vaccinations-current': '💉',
  'vaccinations-overdue': '⚠️',
  
  // Behavioral Icons
  'aggressive': '⚠️',
  'anxious': '😰',
  'friendly': '😊',
  'shy': '🙈',
  'energetic': '⚡',
  'calm': '😌',
  
  // Dietary Icons
  'food-allergies': '🚫',
  'special-diet': '🥗',
  'picky-eater': '🍽️',
  
  // Training Icons
  'trained': '🎓',
  'in-training': '📚',
  'needs-training': '📝',
  
  // Other Icons
  'escape-artist': '🏃',
  'barker': '🔊',
  'chewer': '🦴',
  'digger': '⛏️',
  'swimmer': '🏊',
  'fetch': '🎾',
  
  // VIP/Special
  'vip': '⭐',
  'birthday': '🎂',
  'new': '🆕'
};

/**
 * Convert pet icon IDs to emoji characters
 * @param iconIds - Array of icon ID strings
 * @returns Array of emoji characters
 */
export const mapPetIconsToEmojis = (iconIds: string[] | null | undefined): string[] => {
  if (!iconIds || !Array.isArray(iconIds)) {
    return [];
  }
  
  return iconIds
    .map(id => PET_ICON_MAP[id] || id) // Use emoji if mapped, otherwise use the ID itself
    .filter(icon => icon && icon.trim()); // Filter out empty values
};

/**
 * Get emoji for a specific icon ID
 * @param iconId - Icon ID string
 * @returns Emoji character or the original ID if not mapped
 */
export const getPetIconEmoji = (iconId: string): string => {
  return PET_ICON_MAP[iconId] || iconId;
};
