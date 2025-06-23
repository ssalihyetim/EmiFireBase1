import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedPlanningSection } from './enhanced-planning-section';
import type { Machine } from '@/types/planning';
import { Timestamp } from 'firebase/firestore';

const mockMachines: Machine[] = [
  { 
    id: '1', 
    name: 'Lathe 1', 
    type: 'turning', 
    model: 'Haas ST-20',
    isActive: true,
    capabilities: ['turning'], 
    hourlyRate: 50, 
    workingHours: { start: '08:00', end: '17:00', workingDays: [1,2,3,4,5] },
    currentWorkload: 0,
    availableFrom: Timestamp.now(),
    maintenanceWindows: []
  },
  { 
    id: '2', 
    name: 'Milling Machine 1', 
    type: 'milling', 
    model: 'DMG Mori DMU 50',
    isActive: true,
    capabilities: ['3-axis-milling'], 
    hourlyRate: 75, 
    workingHours: { start: '08:00', end: '17:00', workingDays: [1,2,3,4,5] },
    currentWorkload: 0,
    availableFrom: Timestamp.now(),
    maintenanceWindows: []
  },
];

describe('EnhancedPlanningSection', () => {
  it('should render and allow adding a process instance', () => {
    const onPlanningDataChange = jest.fn();
    render(
      <EnhancedPlanningSection
        selectedProcesses={['Turning']}
        quantity={10}
        onPlanningDataChange={onPlanningDataChange}
        machines={mockMachines}
      />
    );

    // Check if the initial process is there
    expect(screen.getByText('Turning 1')).toBeInTheDocument();

    // The component should call onPlanningDataChange on initial render
    expect(onPlanningDataChange).toHaveBeenCalled();

  });

  it('should add a new instance of a process when the add button is clicked', async () => {
    const onPlanningDataChange = jest.fn();
    const { findAllByRole } = render(
      <EnhancedPlanningSection
        selectedProcesses={['Turning']}
        quantity={10}
        onPlanningDataChange={onPlanningDataChange}
        machines={mockMachines}
      />
    );

    // Find the add button for "Turning"
    const addButton = (await findAllByRole('button', { name: /add instance/i }))[0];
    fireEvent.click(addButton);

    // Check if "Turning 2" is now in the document
    expect(screen.getByText('Turning 2')).toBeInTheDocument();
  });
}); 