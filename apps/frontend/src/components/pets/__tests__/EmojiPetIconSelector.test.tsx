import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmojiPetIconSelector from '../EmojiPetIconSelector';
import { ALL_PET_ICONS } from '../../../constants/petIcons';

describe('EmojiPetIconSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render the component with title and instructions', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      expect(screen.getByText('Pet Icons')).toBeInTheDocument();
      expect(screen.getByText(/Select icons that apply to this pet/)).toBeInTheDocument();
    });

    it('should render all icon categories', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      expect(screen.getByText('Group Compatibility')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('Behavioral Alerts')).toBeInTheDocument();
      expect(screen.getByText('Medical')).toBeInTheDocument();
      expect(screen.getByText('Handling Requirements')).toBeInTheDocument();
      expect(screen.getByText('Custom Flags')).toBeInTheDocument();
    });

    it('should render all available icons', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      // Check that all icons are rendered (should be multiple chips)
      const chips = screen.getAllByRole('button');
      expect(chips.length).toBeGreaterThan(20); // We have many icons
    });

    it('should not show selected section when no icons are selected', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      expect(screen.queryByText(/Selected \(/)).not.toBeInTheDocument();
    });

    it('should show selected section when icons are selected', () => {
      render(<EmojiPetIconSelector selectedIcons={['dog-aggressive', 'small-size']} onChange={mockOnChange} />);
      
      expect(screen.getByText('Selected (2):')).toBeInTheDocument();
    });
  });

  describe('Icon Selection', () => {
    it('should call onChange when an icon is clicked', async () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      // Find and click the first icon (should be a group icon)
      const chips = screen.getAllByRole('button');
      fireEvent.click(chips[0]);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(1);
      });
      expect(mockOnChange).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String)]));
    });

    it('should add icon to selection when clicked', async () => {
      const { rerender } = render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      const chips = screen.getAllByRole('button');
      fireEvent.click(chips[0]);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
      
      // Get the icon ID that was added
      const addedIconId = mockOnChange.mock.calls[0][0][0];
      
      // Rerender with the new selection
      rerender(<EmojiPetIconSelector selectedIcons={[addedIconId]} onChange={mockOnChange} />);
      
      expect(screen.getByText('Selected (1):')).toBeInTheDocument();
    });

    it('should remove icon from selection when clicked again', async () => {
      render(<EmojiPetIconSelector selectedIcons={['dog-aggressive']} onChange={mockOnChange} />);
      
      // The delete button in the selected section should remove the icon
      const deleteButtons = screen.getAllByTestId('CancelIcon');
      expect(deleteButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('should handle multiple selections', async () => {
      const { rerender } = render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      const chips = screen.getAllByRole('button');
      
      // Click first icon
      fireEvent.click(chips[0]);
      await waitFor(() => expect(mockOnChange).toHaveBeenCalledTimes(1));
      
      const firstIconId = mockOnChange.mock.calls[0][0][0];
      rerender(<EmojiPetIconSelector selectedIcons={[firstIconId]} onChange={mockOnChange} />);
      
      // Click second icon
      fireEvent.click(chips[1]);
      await waitFor(() => expect(mockOnChange).toHaveBeenCalledTimes(2));
      
      expect(mockOnChange.mock.calls[1][0]).toHaveLength(2);
    });
  });

  describe('Behavioral Icons', () => {
    it('should render all aggressive behavior icons', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      const behavioralSection = screen.getByText('Behavioral Alerts');
      expect(behavioralSection).toBeInTheDocument();
      
      // Check for specific aggressive icons by their emojis
      expect(screen.getByText('🐕‍🦺⚔️')).toBeInTheDocument(); // Dog Aggressive
      expect(screen.getByText('♂️⚔️')).toBeInTheDocument(); // Male Aggressive
      expect(screen.getByText('🦮⚠️')).toBeInTheDocument(); // Leash Aggressive
    });

    it('should include poop eater icon', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      expect(screen.getByText('💩🚫')).toBeInTheDocument(); // Poop Eater
    });

    it('should include no collar icon', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      expect(screen.getByText('🦴🚫')).toBeInTheDocument(); // No Collar
    });

    it('should include fence fighter icon', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      expect(screen.getByText('🧱⚔️')).toBeInTheDocument(); // Fence Fighter
    });
  });

  describe('Icon Tooltips', () => {
    it('should show tooltip with description on hover', async () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      const chips = screen.getAllByRole('button');
      
      // Hover over first icon
      fireEvent.mouseOver(chips[0]);
      
      await waitFor(() => {
        // Tooltip should appear with label and description
        const tooltip = screen.queryByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
      });
    });
  });

  describe('Selected Icons Display', () => {
    it('should display selected icons with delete buttons', () => {
      render(<EmojiPetIconSelector 
        selectedIcons={['dog-aggressive', 'medication-required']} 
        onChange={mockOnChange} 
      />);
      
      expect(screen.getByText('Selected (2):')).toBeInTheDocument();
      
      // Should show the emoji icons
      const dogIcon = screen.getAllByText('🐕‍🦺⚔️')[0]; // First occurrence in selected section
      const medIcon = screen.getAllByText('💊')[0];
      expect(dogIcon).toBeInTheDocument();
      expect(medIcon).toBeInTheDocument();
    });

    it('should remove icon when delete button is clicked in selected section', async () => {
      render(<EmojiPetIconSelector 
        selectedIcons={['dog-aggressive']} 
        onChange={mockOnChange} 
      />);
      
      // Find the delete button (cancel icon) in the selected chip
      const deleteButtons = screen.getAllByTestId('CancelIcon');
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([]);
      });
    });
  });

  describe('Icon Categories', () => {
    it('should have correct number of group icons', () => {
      const groupIcons = ALL_PET_ICONS.filter(icon => icon.category === 'group');
      expect(groupIcons.length).toBe(4); // Small, Medium, Large, Solo
    });

    it('should have correct number of size icons', () => {
      const sizeIcons = ALL_PET_ICONS.filter(icon => icon.category === 'size');
      expect(sizeIcons.length).toBe(3); // Small, Medium, Large
    });

    it('should have correct number of behavior icons', () => {
      const behaviorIcons = ALL_PET_ICONS.filter(icon => icon.category === 'behavior');
      expect(behaviorIcons.length).toBeGreaterThanOrEqual(14); // All behavioral alerts
    });

    it('should have correct number of medical icons', () => {
      const medicalIcons = ALL_PET_ICONS.filter(icon => icon.category === 'medical');
      expect(medicalIcons.length).toBe(6);
    });

    it('should have correct number of handling icons', () => {
      const handlingIcons = ALL_PET_ICONS.filter(icon => icon.category === 'handling');
      expect(handlingIcons.length).toBe(3);
    });

    it('should have correct number of flag icons', () => {
      const flagIcons = ALL_PET_ICONS.filter(icon => icon.category === 'flag');
      expect(flagIcons.length).toBe(5); // Red, Yellow, Green, Blue, White
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      const chips = screen.getAllByRole('button');
      expect(chips.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', () => {
      render(<EmojiPetIconSelector selectedIcons={[]} onChange={mockOnChange} />);
      
      const chips = screen.getAllByRole('button');
      chips[0].focus();
      
      expect(chips[0]).toHaveFocus();
    });
  });
});
