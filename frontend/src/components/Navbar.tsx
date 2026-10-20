import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Database,
  Map,
  BrainCircuit,
  Server,
  Menu,
  X,
  Activity,
  Moon,
  Sun,
} from 'lucide-react';
import type { AppView } from '../types';
import { useTheme } from '../ThemeContext';
import { AcqWatchBrand } from './AcqWatchLogo';

export type NavigationTab =
  | 'dashboard'
  | 'projects'
  | 'map'
  | 'sandbox'
  | 'corridors'
  | 'contagion';

interface AcqNavbarProps {
  activeView: AppView;
  setActiveView: (v: AppView) => void;
  backendStatus?: 'ok' | 'degraded' | 'error' | 'loading';
  totalProjects?: number | null;
}

const NAV_ITEMS: Array<{
  id: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview',       label: 'Overview',         icon: LayoutDashboard },
  { id: 'explorer',       label: 'Explorer',          icon: Database },
  { id: 'map',            label: 'Risk Map',          icon: Map },
  { id: 'simulator',      label: 'Model Testing',     icon: Activity },
  { id: 'explainability', label: 'Explainability',    icon: BrainCircuit },
  { id: 'model',          label: 'Model & Data',      icon: Server },
];

const STATUS_CONFIG = {
  ok:      { color: '#22c55e', pulse: true,  label: 'Live' },
  degraded:{ color: '#f59e0b', pulse: false, label: 'Degraded' },
  error:   { color: '#ef4444', pulse: false, label: 'Offline' },
  loading: { color: '#6b7280', pulse: true,  label: 'Connecting' },
};

const ThemeToggle: React.FC = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '56px',
        height: '28px',
        padding: '3px',
        borderRadius: '999px',
        background: isDark
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))'
          : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.15)'}`,
        boxShadow: isDark
          ? 'inset 0 1px 2px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
          : 'inset 0 1px 2px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Background Icons */}
      <div
        style={{
          position: 'absolute',
          left: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDark ? 0.3 : 0.9,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          transform: isDark ? 'scale(0.8)' : 'scale(1)',
          color: '#d97706',
          pointerEvents: 'none',
        }}
      >
        <Sun className="w-3.5 h-3.5" />
      </div>

      <div
        style={{
          position: 'absolute',
          right: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDark ? 0.9 : 0.3,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          transform: isDark ? 'scale(1)' : 'scale(0.8)',
          color: '#818cf8',
          pointerEvents: 'none',
        }}
      >
        <Moon className="w-3.5 h-3.5" />
      </div>

      {/* Floating Thumb */}
      <div
        style={{
          position: 'relative',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          backgroundColor: isDark ? '#3b82f6' : '#ffffff',
          boxShadow: isDark
            ? '0 0 10px rgba(59, 130, 246, 0.6), 0 1px 3px rgba(0,0,0,0.4)'
            : '0 2px 5px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isDark ? 'translateX(28px)' : 'translateX(0px)',
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s ease',
          zIndex: 1,
        }}
      >
        {isDark ? (
          <Moon style={{ width: '12px', height: '12px', color: '#ffffff', transition: 'all 0.3s' }} />
        ) : (
          <Sun style={{ width: '12px', height: '12px', color: '#f59e0b', transition: 'all 0.3s' }} />
        )}
      </div>
    </button>
  );
};

export const AcqNavbar: React.FC<AcqNavbarProps> = ({
  activeView,
  setActiveView,
  backendStatus = 'loading',
  totalProjects,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const status = STATUS_CONFIG[backendStatus];

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: scrolled
            ? 'var(--nav-bg-scroll)'
            : 'var(--nav-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--nav-border)',
          transition: 'background-color 200ms ease, border-color 200ms ease',
        }}
        role="banner"
      >
        {/* Top accent line */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%)',
        }} />

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>

            {/* Brand */}
            <div
              onClick={() => setActiveView('overview')}
              style={{ cursor: 'pointer', flexShrink: 0 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveView('overview')}
              title="AcqWatch Home"
            >
              <AcqWatchBrand size={34} />
            </div>

            {/* Desktop navigation */}
            <nav
              style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
              aria-label="Main navigation"
              className="hidden md:flex"
            >
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const isActive = activeView === id;
                return (
                  <button
                    key={id}
                    id={`nav-${id}`}
                    onClick={() => setActiveView(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: isActive ? 'var(--color-accent)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--accent-subtle)' : 'transparent',
                      border: `1px solid ${isActive ? 'var(--accent-glow)' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                      }
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Project count */}
              {totalProjects != null && (
                <div
                  className="hidden sm:flex"
                  style={{
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <Activity style={{ width: '11px', height: '11px', color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {totalProjects.toLocaleString()} projects
                  </span>
                </div>
              )}

              {/* ── Theme toggle button ── */}
              <ThemeToggle />

              {/* Status dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: status.color,
                      display: 'block',
                    }}
                    aria-label={status.label}
                  />
                  {status.pulse && (
                    <span
                      style={{
                        position: 'absolute',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: status.color,
                        opacity: 0.4,
                        animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                      }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className="hidden lg:inline"
                  style={{ fontSize: '11px', color: '#4a5c78' }}
                >
                  {status.label}
                </span>
              </div>

              {/* Mobile toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden"
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#8899b4',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            style={{
              background: 'rgba(10, 13, 20, 0.98)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              animation: 'fadeIn 150ms ease both',
            }}
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const isActive = activeView === id;
                return (
                  <button
                    key={id}
                    onClick={() => { setActiveView(id); setMobileOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: isActive ? '#93c5fd' : '#8899b4',
                      background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(59,130,246,0.2)' : 'transparent'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Spacer */}
      <div style={{ height: '58px' }} aria-hidden="true" />
    </>
  );
};

// ── Legacy Navbar (kept for existing components that import it) ───────────────
interface LegacyNavbarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  user?: any;
  onSwitchRole?: (role: 'Admin' | 'Viewer') => void;
  onOpenAuditLogs?: () => void;
}

export const Navbar: React.FC<LegacyNavbarProps> = () => null;

export default AcqNavbar;
