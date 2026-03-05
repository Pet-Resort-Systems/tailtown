import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MedicationForm from '../MedicationForm';
import { CheckInMedication } from '../../../services/checkInService';

describe('MedicationForm', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders empty state correctly', () => {
    render(<MedicationForm medications={[]} onChange={mockOnChange} />);
    
    expect(screen.getByText('Medications')).toBeInTheDocument();
    expect(screen.getByText(/No medications added/i)).toBeInTheDocument();
    expect(screen.getByText('Add Medication')).toBeInTheDocument();
  });

  it('adds a new medication when button is clicked', async () => {
    render(<MedicationForm medications={[]} onChange={mockOnChange} />);
    
    const addButton = screen.getByText('Add Medication');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          medicationName: '',
          dosage: '',
          frequency: '',
          administrationMethod: 'ORAL_PILL',
          withFood: false
        })
      ]);
    });
  });

  it('displays existing medications', () => {
    const medications: CheckInMedication[] = [
      {
        medicationName: 'Prednisone',
        dosage: '10mg',
        frequency: 'Twice daily',
        administrationMethod: 'ORAL_PILL',
        timeOfDay: '8:00 AM, 8:00 PM',
        withFood: true
      }
    ];

    render(<MedicationForm medications={medications} onChange={mockOnChange} />);
    
    expect(screen.getByDisplayValue('Prednisone')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10mg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Twice daily')).toBeInTheDocument();
  });

  it('updates medication fields correctly', async () => {
    const medications: CheckInMedication[] = [
      {
        medicationName: '',
        dosage: '',
        frequency: '',
        administrationMethod: 'ORAL_PILL',
        withFood: false
      }
    ];

    render(<MedicationForm medications={medications} onChange={mockOnChange} />);
    
    const nameInput = screen.getByPlaceholderText(/e.g., Prednisone/i);
    await userEvent.type(nameInput, 'Rimadyl');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          medicationName: 'Rimadyl'
        })
      ]);
    });
  });

  it('removes medication when delete button is clicked', async () => {
    const medications: CheckInMedication[] = [
      {
        medicationName: 'Prednisone',
        dosage: '10mg',
        frequency: 'Twice daily',
        administrationMethod: 'ORAL_PILL',
        withFood: false
      }
    ];

    render(<MedicationForm medications={medications} onChange={mockOnChange} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  it('toggles withFood checkbox correctly', async () => {
    const medications: CheckInMedication[] = [
      {
        medicationName: 'Test Med',
        dosage: '10mg',
        frequency: 'Once daily',
        administrationMethod: 'ORAL_PILL',
        withFood: false
      }
    ];

    render(<MedicationForm medications={medications} onChange={mockOnChange} />);
    
    const checkbox = screen.getByRole('checkbox', { name: /give with food/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          withFood: true
        })
      ]);
    });
  });

  it('displays all administration method options', () => {
    const medications: CheckInMedication[] = [
      {
        medicationName: 'Test',
        dosage: '10mg',
        frequency: 'Daily',
        administrationMethod: 'ORAL_PILL',
        withFood: false
      }
    ];

    render(<MedicationForm medications={medications} onChange={mockOnChange} />);
    
    // Click the select to open options
    const select = screen.getByLabelText(/Administration Method/i);
    fireEvent.mouseDown(select);

    // Check that all options are available
    expect(screen.getByText('Oral Pill/Tablet')).toBeInTheDocument();
    expect(screen.getByText('Oral Liquid')).toBeInTheDocument();
    expect(screen.getByText('Topical (Applied to skin)')).toBeInTheDocument();
    expect(screen.getByText('Injection')).toBeInTheDocument();
    expect(screen.getByText('Eye Drops')).toBeInTheDocument();
    expect(screen.getByText('Ear Drops')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('handles multiple medications correctly', () => {
    const medications: CheckInMedication[] = [
      {
        medicationName: 'Med 1',
        dosage: '10mg',
        frequency: 'Daily',
        administrationMethod: 'ORAL_PILL',
        withFood: false
      },
      {
        medicationName: 'Med 2',
        dosage: '5mg',
        frequency: 'Twice daily',
        administrationMethod: 'ORAL_LIQUID',
        withFood: true
      }
    ];

    render(<MedicationForm medications={medications} onChange={mockOnChange} />);
    
    expect(screen.getByText('Medication 1: Med 1')).toBeInTheDocument();
    expect(screen.getByText('Medication 2: Med 2')).toBeInTheDocument();
  });
});
