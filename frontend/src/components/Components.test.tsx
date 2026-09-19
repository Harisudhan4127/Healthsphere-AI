import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskBadge } from './RiskBadge'
import { EmptyState } from './EmptyState'
import { RiskGauge } from './RiskGauge'
import { getRiskStyles, formatDate, formatDateTime } from '@/lib/utils'

describe('RiskBadge', () => {
  it.each([
    ['LOW', /Low/],
    ['MODERATE', /Moderate/],
    ['ELEVATED', /Elevated/],
    ['HIGH', /High/],
  ] as const)('renders label for %s', (_level, label) => {
    render(<RiskBadge level={_level} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('renders a score when provided', () => {
    render(<RiskBadge level="HIGH" score={82} />)
    expect(screen.getByText('82')).toBeInTheDocument()
  })

  it('falls back to LOW for unknown levels', () => {
    render(<RiskBadge level={null} />)
    expect(screen.getByText(/Low/)).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('shows title and optional description', () => {
    render(<EmptyState title="No patients" description="Add your first patient" />)
    expect(screen.getByText('No patients')).toBeInTheDocument()
    expect(screen.getByText('Add your first patient')).toBeInTheDocument()
  })
})

describe('RiskGauge', () => {
  it('exposes an accessible risk label', () => {
    render(<RiskGauge score={75} level="HIGH" />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Risk score 75 of 100')
  })

  it('clamps scores out of range', () => {
    render(<RiskGauge score={120} level="HIGH" />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Risk score 100 of 100')
  })
})

describe('getRiskStyles', () => {
  it('maps each risk level to a label', () => {
    expect(getRiskStyles('LOW').label).toBe('Low')
    expect(getRiskStyles('MODERATE').label).toBe('Moderate')
    expect(getRiskStyles('ELEVATED').label).toBe('Elevated')
    expect(getRiskStyles('HIGH').label).toBe('High')
  })
})

describe('date formatting', () => {
  it('formats ISO dates into readable values', () => {
    const date = '2026-01-05T10:30:00'
    expect(formatDate(date)).toMatch(/Jan/) 
    expect(formatDate(date)).toContain('2026')
    expect(formatDateTime(date)).toMatch(/Jan/)
  })

  it('handles null input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDateTime(null)).toBe('—')
  })
})