/**
 * HelpTooltip Component
 * Inline contextual help with hover/click tooltip
 */

import React, { useState } from 'react';
import {
  Tooltip,
  IconButton,
  Box,
  Typography,
  Link,
  ClickAwayListener
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { HelpTooltipContent } from '../../types/help';

interface HelpTooltipProps {
  content: HelpTooltipContent;
  onLearnMore?: (articleId: string) => void;
  size?: 'small' | 'medium';
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  onLearnMore,
  size = 'small',
  placement = 'top'
}) => {
  const [open, setOpen] = useState(false);

  const handleTooltipClose = () => {
    setOpen(false);
  };

  const handleTooltipOpen = () => {
    setOpen(true);
  };

  const handleLearnMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (content.learnMoreArticleId && onLearnMore) {
      onLearnMore(content.learnMoreArticleId);
    }
    setOpen(false);
  };

  const tooltipContent = (
    <Box sx={{ maxWidth: 300, p: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {content.title}
      </Typography>
      <Typography variant="body2" sx={{ mb: content.learnMoreArticleId ? 1 : 0 }}>
        {content.description}
      </Typography>
      {content.learnMoreArticleId && (
        <Link
          component="button"
          variant="body2"
          onClick={handleLearnMore}
          sx={{ 
            textDecoration: 'underline',
            cursor: 'pointer',
            '&:hover': {
              textDecoration: 'none'
            }
          }}
        >
          Learn more →
        </Link>
      )}
    </Box>
  );

  return (
    <ClickAwayListener onClickAway={handleTooltipClose}>
      <Tooltip
        title={tooltipContent}
        open={open}
        onClose={handleTooltipClose}
        placement={placement}
        arrow
        PopperProps={{
          disablePortal: true,
        }}
      >
        <IconButton
          size={size}
          onClick={handleTooltipOpen}
          sx={{ 
            ml: 0.5,
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main'
            }
          }}
        >
          <HelpOutlineIcon fontSize={size} />
        </IconButton>
      </Tooltip>
    </ClickAwayListener>
  );
};

export default HelpTooltip;
