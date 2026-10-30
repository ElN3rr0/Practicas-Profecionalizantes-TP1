import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimerBar from './TimerBar';

describe('TimerBar', () => {
  it('shows the remaining seconds and drains the bar proportionally', () => {
    render(<TimerBar remaining={15} total={20} />);

    expect(screen.getByTestId('countdown')).toHaveTextContent('15');
    expect(screen.getByTestId('timer-bar')).toHaveStyle({ width: '75%' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '15');
  });

  it('fills the bar at the full configured time', () => {
    render(<TimerBar remaining={30} total={30} />);

    expect(screen.getByTestId('timer-bar')).toHaveStyle({ width: '100%' });
  });

  it('never renders a negative width', () => {
    render(<TimerBar remaining={0} total={20} />);

    expect(screen.getByTestId('countdown')).toHaveTextContent('0');
    expect(screen.getByTestId('timer-bar')).toHaveStyle({ width: '0%' });
  });

  it('clamps the width when the timer was extended beyond its original total', () => {
    render(<TimerBar remaining={35} total={20} />);

    expect(screen.getByTestId('timer-bar')).toHaveStyle({ width: '100%' });
  });

  it('falls back to a non-zero denominator', () => {
    render(<TimerBar remaining={0} total={0} />);

    expect(screen.getByTestId('timer-bar')).toHaveStyle({ width: '0%' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1');
  });
});
