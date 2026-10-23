import { render } from '@testing-library/react';
import React from 'react';
import FontSettingsTab from '../../../../src/components/SettingsDialog/FontSettingsTab';

const createProps = () => ({
  fontSize: 14,
  fontFamily: 'Roboto',
  fontFamilyMonospace: 'monospace',
  fontInputMode: 'select' as const,
  fontInputModeMonospace: 'select' as const,
  setFontSize: jest.fn(),
  setFontFamily: jest.fn(),
  setFontFamilyMonospace: jest.fn(),
  handleFontInputModeChange: jest.fn(),
  handleFontInputModeMonospaceChange: jest.fn(),
});

describe('FontSettingsTab', () => {
  it('should render correctly', () => {
    const { asFragment } = render(<FontSettingsTab {...createProps()} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
