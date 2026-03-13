import React from 'react';
import { Avatar, AvatarProps } from '@mui/material';
import {
  Person,
  Face,
  EmojiEmotions,
  SentimentSatisfied,
  SentimentVerySatisfied,
  Mood,
  TagFaces,
  InsertEmoticon,
} from '@mui/icons-material';

interface CustomerIconDisplayProps extends Omit<AvatarProps, 'children'> {
  icon?: string;
  color?: string;
  name?: string;
}

const ICON_MAP = {
  person: Person,
  face: Face,
  smile: EmojiEmotions,
  satisfied: SentimentSatisfied,
  happy: SentimentVerySatisfied,
  mood: Mood,
  tag: TagFaces,
  emoticon: InsertEmoticon,
};

const COLOR_MAP: Record<string, string> = {
  blue: '#2196F3',
  green: '#4CAF50',
  purple: '#9C27B0',
  orange: '#FF9800',
  red: '#F44336',
  teal: '#009688',
  pink: '#E91E63',
  indigo: '#3F51B5',
  cyan: '#00BCD4',
  lime: '#CDDC39',
  amber: '#FFC107',
  brown: '#795548',
};

const CustomerIconDisplay: React.FC<CustomerIconDisplayProps> = ({
  icon = 'person',
  color = 'blue',
  name,
  sx,
  ...props
}) => {
  const IconComponent = ICON_MAP[icon as keyof typeof ICON_MAP] || Person;
  const bgColor = COLOR_MAP[color] || '#2196F3';

  // If no custom icon, show initials
  if (!icon && name) {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <Avatar
        sx={{
          bgcolor: bgColor,
          ...sx,
        }}
        {...props}
      >
        {initials}
      </Avatar>
    );
  }

  return (
    <Avatar
      sx={{
        bgcolor: bgColor,
        ...sx,
      }}
      {...props}
    >
      <IconComponent />
    </Avatar>
  );
};

export default CustomerIconDisplay;
