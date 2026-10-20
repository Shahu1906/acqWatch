import { useState, useEffect, useCallback } from 'react';
import { AcqNavbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { ProjectExplorer } from './components/ProjectExplorer';
import { RiskMap } from './components/RiskMap';
import { ExplainabilityView } from './components/ExplainabilityView';
import { ModelDataView } from './components/ModelDataView';
import { ModelTestingView } from './components/ModelTestingView';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { useScrollReveal } from './useScrollReveal';

import { fetchHealth } from './api';
import type { AppView } from './types';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

type BackendStatus = 'ok' | 'degraded' | 'error' | 'loading';

export function App() {
  useScrollReveal({ threshold: 0.1 });
  const [activeView, setActiveView] = useState<AppView>('overview');
  const [selectedProjectCode, setSelectedProjectCode] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [totalProjects, setTotalProjects] = useState<number | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const h = await fetchHealth();
      setBackendStatus(h.status as BackendStatus);
      if (h.dataset_project_count != null) {
        setTotalProjects(h.dataset_project_count);
      }
      setFatalError(null);
    } catch (err: any) {
      setBackendStatus('error');
      setFatalError(err.message || 'Cannot connect to AcqWatch backend');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleNavigate = (view: AppView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <AcqNavbar
        activeView={activeView}
        setActiveView={handleNavigate}
        backendStatus={backendStatus}
        totalProjects={totalProjects}
      />

      <main id="main-content" role="main">
        {/* Backend error banner */}
        {fatalError && (
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px 0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle style={{ width: '16px', height: '16px', color: '#fca5a5', flexShrink: 0 }} />
                <p style={{ fontSize: '14px', color: '#fca5a5' }}>
                  <strong>Backend unreachable:</strong> {fatalError}
                </p>
              </div>
              <button
                onClick={checkHealth}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <RefreshCw style={{ width: '12px', height: '12px' }} />
                Retry
              </button>
            </div>
          </div>
        )}

        {activeView === 'overview' && <OverviewView onNavigate={handleNavigate} />}
        {activeView === 'explorer' && <ProjectExplorer onSelectProject={setSelectedProjectCode} />}
        {activeView === 'map' && <RiskMap onSelectProject={setSelectedProjectCode} />}
        {activeView === 'simulator' && <ModelTestingView />}
        {activeView === 'explainability' && <ExplainabilityView />}
        {activeView === 'model' && <ModelDataView />}
      </main>

      <ProjectDetailModal
        projectCode={selectedProjectCode}
        onClose={() => setSelectedProjectCode(null)}
      />

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-default)',
          background: 'var(--bg-surface)',
          marginTop: '48px',
        }}
        role="contentinfo"
        aria-label="Site footer"
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck style={{ width: '14px', height: '14px', color: '#22c55e' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#8899b4' }}>
                Non-Fabrication Protocol:
              </span>
              <span style={{ fontSize: '12px', color: '#4a5c78' }}>
                Data sourced from MoSPI Flash Report (Feb 2025) &amp; PMGSY OMMAS
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#4a5c78' }}>
              <span>AcqWatch v2.0</span>
              <span>·</span>
              <span>Ministry of Rural Development</span>
              <span>·</span>
              <button
                onClick={() => handleNavigate('model')}
                style={{ color: '#6b7280', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
              >
                Model transparency
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
