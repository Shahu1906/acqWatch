/**
 * Shared UI primitives used across the AcqWatch application.
 */
import React from 'react';
import { AlertCircle, RefreshCw, Info, ServerCrash, PackageOpen } from 'lucide-react';

// ── Risk utilities ────────────────────────────────────────────────────────────

export function getRiskClass(category: string | null | undefined): string {
  switch (category?.toUpperCase()) {
    case 'CRITICAL': return 'risk-critical';
    case 'HIGH': return 'risk-high';
    case 'MEDIUM': return 'risk-medium';
    case 'LOW': return 'risk-low';
    default: return 'bg-slate-100 text-slate-500 border border-slate-200';
  }
}

export function getRiskColor(category: string | null | undefined): string {
  switch (category?.toUpperCase()) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH': return '#ea580c';
    case 'MEDIUM': return '#ca8a04';
    case 'LOW': return '#16a34a';
    default: return '#94a3b8';
  }
}

export function getRiskBgColor(category: string | null | undefined): string {
  switch (category?.toUpperCase()) {
    case 'CRITICAL': return '#fef2f2';
    case 'HIGH': return '#fff7ed';
    case 'MEDIUM': return '#fefce8';
    case 'LOW': return '#f0fdf4';
    default: return '#f8fafc';
  }
}

// ── RiskBadge ─────────────────────────────────────────────────────────────────

interface RiskBadgeProps {
  category: string | null | undefined;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ category, score, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  if (!category) {
    return (
      <span className={`inline-flex items-center gap-1 rounded font-medium ${sizeClasses[size]} bg-slate-100 text-slate-500`}>
        N/A
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-semibold ${sizeClasses[size]} ${getRiskClass(category)}`}
    >
      {score != null && <span className="tabular-nums">{score}</span>}
      {score != null && <span className="opacity-60">·</span>}
      {category}
    </span>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  height?: number | string;
  width?: number | string;
  rounded?: boolean;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  height,
  width,
  rounded = false,
  count = 1,
}) => {
  const style: React.CSSProperties = {};
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
          style={style}
          role="status"
          aria-label="Loading…"
        />
      ))}
    </>
  );
};

// ── Spinner ───────────────────────────────────────────────────────────────────

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-7 h-7';
  return (
    <RefreshCw
      className={`${s} animate-spin-slow text-blue-600 ${className}`}
      aria-label="Loading"
    />
  );
};

// ── ConnectionError ───────────────────────────────────────────────────────────

interface ConnectionErrorProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const ConnectionError: React.FC<ConnectionErrorProps> = ({
  message,
  onRetry,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{message || 'Failed to load data'}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-auto text-xs font-semibold underline hover:no-underline">
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <ServerCrash className="w-12 h-12 text-slate-300 mb-4" />
      <h3 className="text-base font-semibold text-slate-700 mb-1">Cannot reach backend</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">
        {message || 'The AcqWatch analytics backend is not responding. Ensure the FastAPI server is running.'}
      </p>
      <div className="text-xs text-slate-400 bg-slate-100 rounded px-3 py-1.5 font-mono mb-4">
        uvicorn acqwatch.main:app --port 8080 --reload
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary btn-sm">
          <RefreshCw className="w-3.5 h-3.5" />
          Retry connection
        </button>
      )}
    </div>
  );
};

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No results found',
  description = 'Try adjusting your filters or search query.',
  action,
  icon: Icon = PackageOpen,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <Icon className="w-10 h-10 text-slate-200 mb-3" />
    <h3 className="text-sm font-semibold text-slate-600 mb-1">{title}</h3>
    <p className="text-xs text-slate-400 max-w-xs">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ── UnavailableState ──────────────────────────────────────────────────────────

interface UnavailableStateProps {
  reason?: string | null;
  title?: string;
}

export const UnavailableState: React.FC<UnavailableStateProps> = ({
  reason,
  title = 'Not available',
}) => (
  <div className="flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
    <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
    <div>
      <p className="text-sm font-medium text-amber-800">{title}</p>
      {reason && <p className="text-xs text-amber-700 mt-0.5">{reason}</p>}
    </div>
  </div>
);

// ── SectionHeader ─────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={`flex items-start justify-between gap-4 ${className}`}>
    <div>
      <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ── MetricCard ────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  sub?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent?: string;
  onClick?: () => void;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sub,
  icon: Icon,
  accent = '#1d4ed8',
  onClick,
  loading = false,
}) => (
  <div
    onClick={onClick}
    className={`card p-5 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-150' : ''}`}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
  >
    {Icon && (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
    )}
    <div>
      {loading ? (
        <Skeleton height={32} width={80} />
      ) : (
        <div className="metric-value" style={{ color: accent }}>
          {value ?? '—'}
        </div>
      )}
      <div className="metric-label mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  </div>
);

// ── FilterChip ────────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, onRemove }) => (
  <span className="chip group">
    {label}
    <button
      onClick={onRemove}
      className="ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
      aria-label={`Remove filter: ${label}`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
        <path d="M8 2L2 8M2 2l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  </span>
);

// ── Disclaimer banner ─────────────────────────────────────────────────────────

export const ModelDisclaimer: React.FC<{ text?: string }> = ({
  text = 'Model outputs are decision-support tools only. They are not legal or administrative determinations.',
}) => (
  <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
    <p className="text-[11px] text-slate-500 leading-relaxed">{text}</p>
  </div>
);

// ── Format helpers ────────────────────────────────────────────────────────────

export function formatCrore(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K Cr`;
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

export function formatDelayMonths(months: number | null | undefined): string {
  if (months == null) return '—';
  if (months <= 0) return 'On time';
  if (months === 1) return '+1 month';
  return `+${months} months`;
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}%`;
}
