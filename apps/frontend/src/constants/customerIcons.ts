/**
 * Customer Icon Definitions
 * Icons for quick visual reference of customer status, preferences, and special handling needs
 */

export interface CustomerIcon {
  id: string;
  icon: string;
  label: string;
  description: string;
  category: 'status' | 'payment' | 'communication' | 'service' | 'flag';
  color?: string;
}

// Status Icons
export const STATUS_ICONS: CustomerIcon[] = [
  {
    id: 'vip',
    icon: '⭐',
    label: 'VIP',
    description: 'VIP customer - priority service',
    category: 'status',
    color: '#FFD700',
  },
  {
    id: 'new_customer',
    icon: '🆕',
    label: 'New',
    description: 'New customer - first visit',
    category: 'status',
    color: '#4CAF50',
  },
  {
    id: 'regular',
    icon: '🔄',
    label: 'Regular',
    description: 'Regular customer - frequent visitor',
    category: 'status',
    color: '#2196F3',
  },
  {
    id: 'inactive',
    icon: '💤',
    label: 'Inactive',
    description: "Inactive - hasn't visited recently",
    category: 'status',
    color: '#9E9E9E',
  },
];

// Payment Icons
export const PAYMENT_ICONS: CustomerIcon[] = [
  {
    id: 'payment_issue',
    icon: '💳',
    label: 'Payment Issue',
    description: 'Has payment issues or outstanding balance',
    category: 'payment',
    color: '#F44336',
  },
  {
    id: 'prepaid',
    icon: '💰',
    label: 'Prepaid',
    description: 'Account has prepaid credit',
    category: 'payment',
    color: '#4CAF50',
  },
  {
    id: 'auto_pay',
    icon: '🔁',
    label: 'Auto-Pay',
    description: 'Automatic payment enabled',
    category: 'payment',
    color: '#2196F3',
  },
  {
    id: 'cash_only',
    icon: '💵',
    label: 'Cash Only',
    description: 'Prefers cash payments',
    category: 'payment',
    color: '#FF9800',
  },
];

// Communication Icons
export const COMMUNICATION_ICONS: CustomerIcon[] = [
  {
    id: 'no_email',
    icon: '📧',
    label: 'No Email',
    description: 'Do not send emails',
    category: 'communication',
    color: '#F44336',
  },
  {
    id: 'no_sms',
    icon: '📱',
    label: 'No SMS',
    description: 'Do not send text messages',
    category: 'communication',
    color: '#F44336',
  },
  {
    id: 'no_calls',
    icon: '📞',
    label: 'No Calls',
    description: 'Do not call - text only',
    category: 'communication',
    color: '#F44336',
  },
  {
    id: 'preferred_contact',
    icon: '✉️',
    label: 'Email Preferred',
    description: 'Prefers email communication',
    category: 'communication',
    color: '#2196F3',
  },
];

// Service Preference Icons
export const SERVICE_ICONS: CustomerIcon[] = [
  {
    id: 'grooming_only',
    icon: '✂️',
    label: 'Grooming Only',
    description: 'Only uses grooming services',
    category: 'service',
    color: '#9C27B0',
  },
  {
    id: 'boarding_only',
    icon: '🏠',
    label: 'Boarding Only',
    description: 'Only uses boarding services',
    category: 'service',
    color: '#3F51B5',
  },
  {
    id: 'daycare_only',
    icon: '🎾',
    label: 'Daycare Only',
    description: 'Only uses daycare services',
    category: 'service',
    color: '#FF9800',
  },
  {
    id: 'full_service',
    icon: '🌟',
    label: 'Full Service',
    description: 'Uses all services',
    category: 'service',
    color: '#4CAF50',
  },
  {
    id: 'training',
    icon: '🎓',
    label: 'Training',
    description: 'Enrolled in training classes',
    category: 'service',
    color: '#00BCD4',
  },
];

// General Flag Icons
export const FLAG_ICONS: CustomerIcon[] = [
  {
    id: 'special_instructions',
    icon: '📋',
    label: 'Special Instructions',
    description: 'Has special instructions - check notes',
    category: 'flag',
    color: '#FF9800',
  },
  {
    id: 'allergies',
    icon: '⚠️',
    label: 'Allergies',
    description: 'Pet has allergies - check details',
    category: 'flag',
    color: '#F44336',
  },
  {
    id: 'medication',
    icon: '💊',
    label: 'Medication',
    description: 'Pet requires medication',
    category: 'flag',
    color: '#9C27B0',
  },
  {
    id: 'senior_pet',
    icon: '👴',
    label: 'Senior Pet',
    description: 'Has senior pet - special care needed',
    category: 'flag',
    color: '#795548',
  },
  {
    id: 'anxious_pet',
    icon: '😰',
    label: 'Anxious Pet',
    description: 'Pet is anxious - handle with care',
    category: 'flag',
    color: '#FF5722',
  },
  {
    id: 'aggressive_pet',
    icon: '⚡',
    label: 'Aggressive',
    description: 'Pet can be aggressive - caution',
    category: 'flag',
    color: '#F44336',
  },
  {
    id: 'escape_artist',
    icon: '🏃',
    label: 'Escape Artist',
    description: 'Pet tries to escape - watch carefully',
    category: 'flag',
    color: '#FF9800',
  },
  {
    id: 'note',
    icon: '📝',
    label: 'Note',
    description: 'General note - check customer notes',
    category: 'flag',
    color: '#607D8B',
  },
];

// All icons combined
export const ALL_CUSTOMER_ICONS: CustomerIcon[] = [
  ...STATUS_ICONS,
  ...PAYMENT_ICONS,
  ...COMMUNICATION_ICONS,
  ...SERVICE_ICONS,
  ...FLAG_ICONS,
];

// Helper function to get icon by ID
export const getCustomerIconById = (id: string): CustomerIcon | undefined => {
  return ALL_CUSTOMER_ICONS.find((icon) => icon.id === id);
};

// Helper function to get icons by category
export const getCustomerIconsByCategory = (
  category: CustomerIcon['category']
): CustomerIcon[] => {
  return ALL_CUSTOMER_ICONS.filter((icon) => icon.category === category);
};
