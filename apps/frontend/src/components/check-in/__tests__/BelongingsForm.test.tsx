import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BelongingsForm from '../BelongingsForm';
import { CheckInBelonging } from '../../../services/checkInService';

describe('BelongingsForm', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders empty state correctly', () => {
    render(<BelongingsForm belongings={[]} onChange={mockOnChange} />);
    
    expect(screen.getByText('Belongings Inventory')).toBeInTheDocument();
    expect(screen.getByText(/No belongings added/i)).toBeInTheDocument();
  });

  it('displays quick-add buttons for common items', () => {
    render(<BelongingsForm belongings={[]} onChange={mockOnChange} />);
    
    expect(screen.getByText(/🔗 Collar/)).toBeInTheDocument();
    expect(screen.getByText(/🦮 Leash/)).toBeInTheDocument();
    expect(screen.getByText(/🎾 Toy/)).toBeInTheDocument();
    expect(screen.getByText(/🛏️ Bedding/)).toBeInTheDocument();
    expect(screen.getByText(/🍖 Food/)).toBeInTheDocument();
    expect(screen.getByText(/🥣 Bowl/)).toBeInTheDocument();
    expect(screen.getByText(/💊 Medication/)).toBeInTheDocument();
    expect(screen.getByText(/🦴 Treats/)).toBeInTheDocument();
  });

  it('adds item when quick-add button is clicked', async () => {
    render(<BelongingsForm belongings={[]} onChange={mockOnChange} />);
    
    const collarButton = screen.getByText(/🔗 Collar/);
    fireEvent.click(collarButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          itemType: 'Collar',
          description: '',
          quantity: 1
        })
      ]);
    });
  });

  it('adds custom item when custom button is clicked', async () => {
    render(<BelongingsForm belongings={[]} onChange={mockOnChange} />);
    
    const customButton = screen.getByText(/\+ Custom Item/);
    fireEvent.click(customButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          itemType: 'Other',
          description: '',
          quantity: 1
        })
      ]);
    });
  });

  it('displays existing belongings', () => {
    const belongings: CheckInBelonging[] = [
      {
        itemType: 'Collar',
        description: 'Blue nylon collar',
        quantity: 1,
        color: 'Blue'
      }
    ];

    render(<BelongingsForm belongings={belongings} onChange={mockOnChange} />);
    
    expect(screen.getByDisplayValue('Collar')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Blue nylon collar')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Blue')).toBeInTheDocument();
  });

  it('updates belonging fields correctly', async () => {
    const belongings: CheckInBelonging[] = [
      {
        itemType: 'Collar',
        description: '',
        quantity: 1
      }
    ];

    render(<BelongingsForm belongings={belongings} onChange={mockOnChange} />);
    
    const descInput = screen.getByPlaceholderText(/e.g., Blue nylon collar/i);
    await userEvent.type(descInput, 'Red leather collar');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          description: 'Red leather collar'
        })
      ]);
    });
  });

  it('removes belonging when delete button is clicked', async () => {
    const belongings: CheckInBelonging[] = [
      {
        itemType: 'Collar',
        description: 'Blue collar',
        quantity: 1
      }
    ];

    render(<BelongingsForm belongings={belongings} onChange={mockOnChange} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  it('updates quantity correctly', async () => {
    const belongings: CheckInBelonging[] = [
      {
        itemType: 'Toy',
        description: 'Tennis ball',
        quantity: 1
      }
    ];

    render(<BelongingsForm belongings={belongings} onChange={mockOnChange} />);
    
    const quantityInput = screen.getByLabelText(/Quantity/i);
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '3');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          quantity: 3
        })
      ]);
    });
  });

  it('displays total items count', () => {
    const belongings: CheckInBelonging[] = [
      {
        itemType: 'Collar',
        description: 'Blue collar',
        quantity: 1
      },
      {
        itemType: 'Toy',
        description: 'Tennis balls',
        quantity: 3
      }
    ];

    render(<BelongingsForm belongings={belongings} onChange={mockOnChange} />);
    
    expect(screen.getByText(/Total Items:/)).toBeInTheDocument();
    expect(screen.getByText(/4 items across 2 categories/)).toBeInTheDocument();
  });

  it('handles multiple belongings correctly', () => {
    const belongings: CheckInBelonging[] = [
      {
        itemType: 'Collar',
        description: 'Blue collar',
        quantity: 1,
        color: 'Blue'
      },
      {
        itemType: 'Leash',
        description: 'Nylon leash',
        quantity: 1,
        color: 'Red'
      }
    ];

    render(<BelongingsForm belongings={belongings} onChange={mockOnChange} />);
    
    expect(screen.getByText('Collar - Blue collar')).toBeInTheDocument();
    expect(screen.getByText('Leash - Nylon leash')).toBeInTheDocument();
  });
});
