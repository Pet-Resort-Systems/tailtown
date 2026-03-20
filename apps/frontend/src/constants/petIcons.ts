import { PetIcon } from '../types/petIcons';

/**
 * Pet icon definitions for the Tailtown application
 * These icons serve as shorthand notes for staff to quickly understand important information about each pet
 */

// Group Type Icons
export const GROUP_ICONS: PetIcon[] = [
  {
    id: 'small-group',
    category: 'group',
    icon: '🟢',
    label: 'Small Group',
    description: 'Compatible with small groups of similar pets',
  },
  {
    id: 'medium-group',
    category: 'group',
    icon: '🟠',
    label: 'Medium Group',
    description: 'Can be in medium-sized playgroups with supervision',
  },
  {
    id: 'large-group',
    category: 'group',
    icon: '🔵',
    label: 'Large Group',
    description: 'Thrives in large playgroups',
  },
  {
    id: 'solo-only',
    category: 'group',
    icon: '⚪',
    label: 'Solo Only',
    description: 'Must be kept separate from other animals',
  },
];

// Size Icons
export const SIZE_ICONS: PetIcon[] = [
  {
    id: 'small-size',
    category: 'size',
    icon: '🐕‍🦺',
    label: 'Small',
    description: 'Under 20 lbs',
  },
  {
    id: 'medium-size',
    category: 'size',
    icon: '🐕',
    label: 'Medium',
    description: '20-50 lbs',
  },
  {
    id: 'large-size',
    category: 'size',
    icon: '🦮',
    label: 'Large',
    description: 'Over 50 lbs',
  },
];

// Behavioral Flags - Aggression
export const AGGRESSION_ICONS: PetIcon[] = [
  {
    id: 'dog-aggressive',
    category: 'behavior',
    icon: '🐕⚔️',
    label: 'Dog Aggressive',
    description: 'Aggressive towards other dogs',
  },
  {
    id: 'male-aggressive',
    category: 'behavior',
    icon: '♂️⚔️',
    label: 'Male Aggressive',
    description: 'Aggressive towards male dogs',
  },
  {
    id: 'female-aggressive',
    category: 'behavior',
    icon: '♀️⚔️',
    label: 'Female Aggressive',
    description: 'Aggressive towards female dogs',
  },
  {
    id: 'room-aggressive',
    category: 'behavior',
    icon: '🏠⚔️',
    label: 'Room Aggressive',
    description: 'Aggressive in kennel/room setting',
  },
  {
    id: 'toy-aggressive',
    category: 'behavior',
    icon: '🧸⚔️',
    label: 'Toy Aggressive',
    description: 'Aggressive over toys',
  },
  {
    id: 'fence-fighter',
    category: 'behavior',
    icon: '🧱⚔️',
    label: 'Fence Fighter',
    description: 'Reactive to animals on other side of fences',
  },
  {
    id: 'biter',
    category: 'behavior',
    icon: '🦷⚠️',
    label: 'Biter',
    description: 'Has bitten - use caution',
  },
];

// Behavioral Flags - Caution
export const CAUTION_ICONS: PetIcon[] = [
  {
    id: 'use-caution',
    category: 'behavior',
    icon: '⚠️',
    label: 'Use Caution',
    description: 'General caution flag - check notes',
  },
  {
    id: 'strong-puller',
    category: 'behavior',
    icon: '💪🦮',
    label: 'Strong Puller',
    description: 'Pulls hard on leash',
  },
  {
    id: 'runner',
    category: 'behavior',
    icon: '🏃💨',
    label: 'Runner',
    description: 'Flight risk - will run if given chance',
  },
  {
    id: 'escape-artist',
    category: 'behavior',
    icon: '🔓🐕',
    label: 'Escape Artist',
    description: 'Attempts to escape from kennels/yards',
  },
  {
    id: 'excessive-mounter',
    category: 'behavior',
    icon: '🐕📍',
    label: 'Excessive Mounter',
    description: 'Mounts other dogs excessively',
  },
];

// Behavioral Flags - General
export const BEHAVIOR_ICONS: PetIcon[] = [
  {
    id: 'poop-eater',
    category: 'behavior',
    icon: '💩🚫',
    label: 'Poop Eater',
    description: 'Eats feces - requires immediate cleanup',
  },
  {
    id: 'chews',
    category: 'behavior',
    icon: '🦴😬',
    label: 'Chews',
    description: 'Destructive chewer',
  },
  {
    id: 'barker',
    category: 'behavior',
    icon: '🔊🐕',
    label: 'Barker',
    description: 'Excessive barking',
  },
  {
    id: 'digger',
    category: 'behavior',
    icon: '🕳️🐾',
    label: 'Digger',
    description: 'Tends to dig in yard areas',
  },
  {
    id: 'resource-guarder',
    category: 'behavior',
    icon: '🦴⚠️',
    label: 'Resource Guarder',
    description: 'Guards food, toys, or space',
  },
  {
    id: 'thunder-reactive',
    category: 'behavior',
    icon: '⚡😰',
    label: 'Thunder Reactive',
    description: 'Sensitive to loud noises/storms',
  },
  {
    id: 'loves-pool',
    category: 'behavior',
    icon: '🏊💙',
    label: 'Loves Pool',
    description: 'Enjoys pool/water play',
  },
];

// Medical Icons
export const MEDICAL_ICONS: PetIcon[] = [
  {
    id: 'medication-required',
    category: 'medical',
    icon: '💊',
    label: 'Has Meds',
    description: 'Needs regular medication',
  },
  {
    id: 'controlled-substance',
    category: 'medical',
    icon: '💊🔒',
    label: 'Controlled Substance',
    description: 'Medication is a controlled substance',
  },
  {
    id: 'seizure-watch',
    category: 'medical',
    icon: '⚡🩺',
    label: 'Seizure Watch',
    description: 'Has seizure history - monitor closely',
  },
  {
    id: 'heat-sensitive',
    category: 'medical',
    icon: '🌡️⚠️',
    label: 'Heat Sensitive',
    description: 'Sensitive to heat - limit outdoor time',
  },
  {
    id: 'deaf',
    category: 'medical',
    icon: '👂🚫',
    label: 'Deaf',
    description: 'Cannot hear - use visual signals',
  },
  {
    id: 'senior',
    category: 'medical',
    icon: '👴🐕',
    label: 'Senior',
    description: 'Senior pet - may need extra care',
  },
  {
    id: 'special-needs',
    category: 'medical',
    icon: '💙',
    label: 'Special Needs',
    description: 'Has special needs - check notes',
  },
  {
    id: 'allergies',
    category: 'medical',
    icon: '🤧',
    label: 'Allergies',
    description: 'Has known allergies',
  },
  {
    id: 'immunizations',
    category: 'medical',
    icon: '💉',
    label: 'Immunizations',
    description: 'Check vaccination status',
  },
  {
    id: 'altered',
    category: 'medical',
    icon: '✂️✓',
    label: 'Altered',
    description: 'Spayed/Neutered',
  },
  {
    id: 'unaltered',
    category: 'medical',
    icon: '✂️✗',
    label: 'Unaltered',
    description: 'Not spayed/neutered',
  },
  {
    id: 'special-diet',
    category: 'medical',
    icon: '🍽️',
    label: 'Special Diet',
    description: 'Has dietary restrictions or requirements',
  },
];

// Handling Icons
export const HANDLING_ICONS: PetIcon[] = [
  {
    id: 'no-leash-on-neck',
    category: 'handling',
    icon: '🦮🚫',
    label: 'No Leash On Neck',
    description: 'Do not attach leash to collar - use harness',
  },
  {
    id: 'harness-only',
    category: 'handling',
    icon: '🦺',
    label: 'Harness Only',
    description: 'Should not be walked with collar only',
  },
  {
    id: 'do-not-bathe',
    category: 'handling',
    icon: '🛁🚫',
    label: 'DO NOT BATHE',
    description: 'Do not bathe this pet',
  },
  {
    id: 'separate-to-feed',
    category: 'handling',
    icon: '🍽️👤',
    label: 'Separate To Feed',
    description: 'Must be separated during feeding',
  },
  {
    id: 'play-time-break',
    category: 'handling',
    icon: '⏰🎾',
    label: 'Play Time Break',
    description: 'Needs scheduled play breaks',
  },
];

// Kennel/Room Icons
export const KENNEL_ICONS: PetIcon[] = [
  {
    id: 'no-bedding',
    category: 'kennel',
    icon: '🛏️🚫',
    label: 'No Bedding',
    description: 'Destroys or eats bedding materials',
  },
  {
    id: 'needs-extra-bedding',
    category: 'kennel',
    icon: '🛏️➕',
    label: 'Needs Extra Bedding',
    description: 'Requires extra bedding for comfort',
  },
  {
    id: 'no-cot',
    category: 'kennel',
    icon: '🛏️❌',
    label: 'No Cot',
    description: 'Do not use cot - floor bedding only',
  },
  {
    id: 'permanent-run-card',
    category: 'kennel',
    icon: '📋🏠',
    label: 'Permanent Run Card',
    description: 'Has permanent run assignment',
  },
];

// Notes & Communication Icons
export const NOTES_ICONS: PetIcon[] = [
  {
    id: 'appointment-card',
    category: 'notes',
    icon: '📅',
    label: 'Appointment Card',
    description: 'Has appointment card on file',
  },
  {
    id: 'employee-notes',
    category: 'notes',
    icon: '📝👤',
    label: 'Employee Notes',
    description: 'Staff notes available - check notes',
  },
  {
    id: 'animal-photo',
    category: 'notes',
    icon: '📷',
    label: 'Animal Photo',
    description: 'Photo on file',
  },
  {
    id: 'animal-notes',
    category: 'notes',
    icon: '📝🐕',
    label: 'Animal Notes',
    description: 'Has notes - check pet notes',
  },
  {
    id: 'reservation-notes',
    category: 'notes',
    icon: '📝📅',
    label: 'Reservation Notes',
    description: 'Has reservation-specific notes',
  },
  {
    id: 'call-notes',
    category: 'notes',
    icon: '📞📝',
    label: 'Call Notes',
    description: 'Has call notes on file',
  },
  {
    id: 'mod-speak-to-owner',
    category: 'notes',
    icon: '👔📞',
    label: 'MOD Speak To Owner',
    description: 'Manager needs to speak with owner',
  },
  {
    id: 'first-time-reservation',
    category: 'notes',
    icon: '🆕📅',
    label: 'First Time Reservation',
    description: 'First reservation - extra attention needed',
  },
  {
    id: 'lost-and-found',
    category: 'notes',
    icon: '🔍📦',
    label: 'Lost & Found',
    description: 'Has items in lost & found',
  },
];

// Account/Customer Icons (shown on pet for customer context)
export const ACCOUNT_ICONS: PetIcon[] = [
  {
    id: 'account-balance',
    category: 'account',
    icon: '💰⚠️',
    label: 'Account Balance',
    description: 'Outstanding account balance',
  },
  {
    id: 'card-on-file',
    category: 'account',
    icon: '💳✓',
    label: 'Card On File',
    description: 'Has card on file for payment',
  },
  {
    id: 'package-credits',
    category: 'account',
    icon: '🎫',
    label: 'Package Credits',
    description: 'Has package credits available',
  },
  {
    id: 'special-client',
    category: 'account',
    icon: '⭐',
    label: 'Special Client',
    description: 'VIP or special client',
  },
  {
    id: 'military-discount',
    category: 'account',
    icon: '🎖️',
    label: 'Military Discount',
    description: 'Receives military discount',
  },
  {
    id: 'fr-discount',
    category: 'account',
    icon: '🚒',
    label: 'FR Discount',
    description: 'First responder discount',
  },
];

// Generic Flags
export const FLAG_ICONS: PetIcon[] = [
  {
    id: 'red-flag',
    category: 'flag',
    icon: '🟥',
    label: 'Red Flag',
    description: 'Critical issue (custom)',
    color: '#f44336',
  },
  {
    id: 'yellow-flag',
    category: 'flag',
    icon: '🟨',
    label: 'Yellow Flag',
    description: 'Caution needed (custom)',
    color: '#ffeb3b',
  },
  {
    id: 'green-flag',
    category: 'flag',
    icon: '🟩',
    label: 'Green Flag',
    description: 'Positive note (custom)',
    color: '#4caf50',
  },
  {
    id: 'blue-flag',
    category: 'flag',
    icon: '🟦',
    label: 'Blue Flag',
    description: 'Special instruction (custom)',
    color: '#2196f3',
  },
  {
    id: 'white-flag',
    category: 'flag',
    icon: '⬜',
    label: 'White Flag',
    description: 'General note (custom)',
    color: '#ffffff',
  },
];

// All icons combined
export const ALL_PET_ICONS: PetIcon[] = [
  ...GROUP_ICONS,
  ...SIZE_ICONS,
  ...AGGRESSION_ICONS,
  ...CAUTION_ICONS,
  ...BEHAVIOR_ICONS,
  ...MEDICAL_ICONS,
  ...HANDLING_ICONS,
  ...KENNEL_ICONS,
  ...NOTES_ICONS,
  ...ACCOUNT_ICONS,
  ...FLAG_ICONS,
];

// Helper function to get an icon by ID
export const getIconById = (id: string): PetIcon | undefined => {
  return ALL_PET_ICONS.find((icon) => icon.id === id);
};

// Helper function to get icons by category
export const getIconsByCategory = (category: string): PetIcon[] => {
  return ALL_PET_ICONS.filter((icon) => icon.category === category);
};
