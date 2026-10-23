import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import ColorSchemeSettingsTab from '../../../../src/components/SettingsDialog/ColorSchemeSettingsTab';

const createProps = () => ({
  darkMode: 'dark' as const,
  theme: 'default',
  syntaxHighlighterTheme: 'auto',
  handleToggleDarkMode: jest.fn(),
  setSyntaxHighlighterTheme: jest.fn(),
  handleToggleTheme: jest.fn(),
});

const renderComponent = (props = createProps()) => render(<ColorSchemeSettingsTab {...props} />);

describe('ColorSchemeSettingsTab', () => {
  it('should render correctly', () => {
    const { asFragment } = renderComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  it('calls handleToggleDarkMode only when another mode is selected', () => {
    const props = createProps();

    renderComponent(props);

    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(props.handleToggleDarkMode).toHaveBeenCalledTimes(1);
    expect(props.handleToggleDarkMode).toHaveBeenCalledWith('light');
  });

  it('calls handleToggleTheme when selecting another theme', () => {
    const props = createProps();

    renderComponent(props);

    const themeSelect = screen.getByTestId('theme-select');
    fireEvent.mouseDown(themeSelect);
    fireEvent.click(themeSelect);
    fireEvent.click(screen.getByRole('option', { name: 'Aurora' }));

    expect(props.handleToggleTheme).toHaveBeenCalledWith('aurora');
  });

  it('calls setSyntaxHighlighterTheme when selecting another syntax theme', () => {
    const props = createProps();

    renderComponent(props);

    const syntaxSelect = screen.getByTestId('syntax-highlighter-theme-select');
    fireEvent.mouseDown(syntaxSelect);
    fireEvent.click(syntaxSelect);
    fireEvent.click(screen.getByRole('option', { name: 'Atom Dark' }));

    expect(props.setSyntaxHighlighterTheme).toHaveBeenCalledWith('atomDark');
  });
});
