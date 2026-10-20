import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from 'lucide-react';
import { fetchProjects, fetchFilters, buildExportUrl } from '../api';
import type {
  ProjectSummary,
  ProjectListResponse,
  FiltersResponse,
  FilterState,
} from '../types';
import {
  Skeleton,
  ConnectionError,
  EmptyState,
  RiskBadge,
  FilterChip,
  formatCrore,
  formatDate,
  formatDelayMonths,
} from './ui';

interface ProjectExplorerProps {
  onSelectProject: (code: string) => void;
  initialFilters?: Partial<FilterState>;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  state: '',
  sector: '',
  agency: '',
  risk_category: '',
  sort_by: 'risk_score',
  sort_order: 'desc',
  page: 1,
  page_size: 50,
};

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

const selectStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '13px',
  color: 'var(--text-primary)',
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-default)',
  borderRadius: '8px',
  padding: '8px 12px',
  cursor: 'pointer',
  outline: 'none',
  transition: 'border-color 150ms ease, background-color 200ms ease, color 200ms ease',
  minWidth: '130px',
};

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  onSelectProject,
  initialFilters,
}) => {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [result, setResult] = useState<ProjectListResponse | null>(null);
  const [filterOptions, setFilterOptions] = useState<FiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchFilters().then(setFilterOptions).catch(() => null);
  }, []);

  const loadProjects = useCallback(async (f: FilterState) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProjects(f, ctrl.signal);
      if (!ctrl.signal.aborted) setResult(data);
    } catch (err: any) {
      if (!ctrl.signal.aborted) setError(err.message || 'Failed to load projects');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects(filters);
    return () => abortRef.current?.abort();
  }, [filters, loadProjects]);

  const debouncedSearch = useCallback(
    debounce((val: string) => { setFilters((f) => ({ ...f, search: val, page: 1 })); }, 350),
    [],
  );

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    debouncedSearch(val);
  };

  const setFilter = (key: keyof FilterState, value: string | number) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  const toggleSort = (field: string) => {
    setFilters((f) => ({
      ...f,
      sort_by: field,
      sort_order: f.sort_by === field && f.sort_order === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  const clearAllFilters = () => { setSearchInput(''); setFilters(DEFAULT_FILTERS); };

  const activeChips: Array<{ label: string; key: keyof FilterState }> = [];
  if (filters.state) activeChips.push({ label: `State: ${filters.state}`, key: 'state' });
  if (filters.sector) activeChips.push({ label: `Sector: ${filters.sector}`, key: 'sector' });
  if (filters.agency) activeChips.push({ label: `Agency: ${filters.agency}`, key: 'agency' });
  if (filters.risk_category) activeChips.push({ label: `Risk: ${filters.risk_category}`, key: 'risk_category' });

  const hasActiveFilters = activeChips.length > 0 || filters.search;
  const exportUrl = buildExportUrl(filters);
  const totalPages = result?.total_pages ?? 1;
  const currentPage = filters.page;

  const SortIcon = ({ field }: { field: string }) => {
    if (filters.sort_by !== field) return null;
    return filters.sort_order === 'asc'
      ? <SortAsc style={{ width: '11px', height: '11px', color: '#60a5fa' }} />
      : <SortDesc style={{ width: '11px', height: '11px', color: '#60a5fa' }} />;
  };

  return (
    <div className="view-enter" style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── Sticky Header ───────────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: '58px',
        zIndex: 30,
        background: 'var(--nav-bg-scroll)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-default)',
        padding: '16px 24px',
        transition: 'background-color 300ms ease, border-color 300ms ease',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Project Explorer
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {loading ? 'Loading…' : result ? (
                  <><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{result.total.toLocaleString()}</span> {result.total === 1 ? 'project' : 'projects'} matched</>
                ) : null}
              </p>
            </div>
            <a
              href={exportUrl}
              download="acqwatch_projects.csv"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              aria-label="Export filtered projects as CSV"
            >
              <Download style={{ width: '13px', height: '13px' }} />
              Export CSV
            </a>
          </div>

          {/* Filter row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '340px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: '#4a5c78' }} />
              <input
                id="project-search"
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search projects, codes, agencies…"
                style={{
                  ...selectStyle,
                  paddingLeft: '34px',
                  width: '100%',
                  minWidth: 0,
                }}
                aria-label="Search projects"
              />
              {searchInput && (
                <button
                  onClick={() => handleSearchChange('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4a5c78', cursor: 'pointer' }}
                >
                  <X style={{ width: '13px', height: '13px' }} />
                </button>
              )}
            </div>

            {/* Dropdowns */}
            <select
              id="filter-state"
              value={filters.state}
              onChange={(e) => setFilter('state', e.target.value)}
              style={selectStyle}
              aria-label="Filter by state"
            >
              <option value="">All States</option>
              {filterOptions?.states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              id="filter-sector"
              value={filters.sector}
              onChange={(e) => setFilter('sector', e.target.value)}
              style={selectStyle}
              aria-label="Filter by sector"
            >
              <option value="">All Sectors</option>
              {filterOptions?.sectors.map((s) => <option key={s} value={s}>{s.replace(' AND ', ' & ')}</option>)}
            </select>

            <select
              id="filter-risk"
              value={filters.risk_category}
              onChange={(e) => setFilter('risk_category', e.target.value)}
              style={selectStyle}
              aria-label="Filter by risk"
            >
              <option value="">All Risk Tiers</option>
              <option value="CRITICAL">🔴 Critical</option>
              <option value="HIGH">🟠 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>

            <select
              id="filter-agency"
              value={filters.agency}
              onChange={(e) => setFilter('agency', e.target.value)}
              style={{ ...selectStyle, display: undefined }}
              className="hidden lg:block"
              aria-label="Filter by agency"
            >
              <option value="">All Agencies</option>
              {filterOptions?.agencies.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                }}
              >
                <X style={{ width: '11px', height: '11px' }} />
                Clear
              </button>
            )}
          </div>

          {/* Filter chips */}
          {activeChips.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {activeChips.map(({ label, key }) => (
                <FilterChip key={key} label={label} onRemove={() => setFilter(key, '')} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        {error && <ConnectionError message={error} onRetry={() => loadProjects(filters)} compact />}

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} aria-label="Projects table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                  {[
                    { label: 'Project',  field: 'project_name',  style: { paddingLeft: '20px' } },
                    { label: 'State',    field: 'state',          className: 'hidden md:table-cell' },
                    { label: 'Sector',   field: 'sector',         className: 'hidden lg:table-cell' },
                    { label: 'Risk',     field: 'risk_score',     style: {} },
                    { label: 'Cost',     field: 'orig_cost_cr',   className: 'hidden lg:table-cell' },
                    { label: 'Delay',    field: 'delay_months',   className: 'hidden md:table-cell' },
                    { label: 'Approved', field: 'approval_date',  className: 'hidden xl:table-cell' },
                  ].map(({ label, field, style: s, className }) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className={className}
                      style={{
                        textAlign: 'left',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        padding: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        ...(s || {}),
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th style={{ padding: '12px' }} />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '14px 12px 14px 20px' }}>
                          <Skeleton height={13} className="mb-1.5" />
                          <Skeleton height={10} width={70} />
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '14px 12px' }}><Skeleton height={13} width={80} /></td>
                        <td className="hidden lg:table-cell" style={{ padding: '14px 12px' }}><Skeleton height={13} width={110} /></td>
                        <td style={{ padding: '14px 12px' }}><Skeleton height={22} width={80} rounded /></td>
                        <td className="hidden lg:table-cell" style={{ padding: '14px 12px' }}><Skeleton height={13} width={60} /></td>
                        <td className="hidden md:table-cell" style={{ padding: '14px 12px' }}><Skeleton height={13} width={50} /></td>
                        <td className="hidden xl:table-cell" style={{ padding: '14px 12px' }}><Skeleton height={13} width={60} /></td>
                        <td style={{ padding: '14px 12px' }} />
                      </tr>
                    ))
                  : result?.items.map((project) => (
                      <ProjectRow
                        key={project.project_code}
                        project={project}
                        onClick={() => onSelectProject(project.project_code)}
                      />
                    ))}
              </tbody>
            </table>

            {!loading && result?.items.length === 0 && (
              <EmptyState
                description={
                  hasActiveFilters
                    ? 'No projects match the current filters. Try adjusting or clearing them.'
                    : 'No projects found in the inventory.'
                }
              />
            )}
          </div>

          {/* Pagination */}
          {!loading && result && result.total_pages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderTop: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Page <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentPage}</span> of{' '}
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalPages}</span> —{' '}
                {result.total.toLocaleString()} total
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                  disabled={currentPage <= 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage <= 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft style={{ width: '13px', height: '13px' }} />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                  const isActive = page === currentPage;
                  return (
                    <button
                      key={page}
                      onClick={() => setFilters((f) => ({ ...f, page }))}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: isActive ? 700 : 500,
                        background: isActive ? 'var(--color-accent)' : 'transparent',
                        border: isActive ? '1px solid var(--color-accent)' : '1px solid transparent',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))}
                  disabled={currentPage >= totalPages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage >= totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight style={{ width: '13px', height: '13px' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Row component ─────────────────────────────────────────────────────────────

const ProjectRow: React.FC<{ project: ProjectSummary; onClick: () => void }> = ({
  project,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 120ms ease',
      }}
      aria-label={`View details for ${project.project_name}`}
    >
      <td style={{ padding: '13px 12px 13px 20px', maxWidth: '260px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.project_name}>
          {project.project_name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
          {project.project_code}
        </div>
      </td>
      <td className="hidden md:table-cell" style={{ padding: '13px 12px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {project.state || '—'}
      </td>
      <td className="hidden lg:table-cell" style={{ padding: '13px 12px', maxWidth: '160px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {project.sector?.replace(' AND ', ' & ') ?? '—'}
        </span>
      </td>
      <td style={{ padding: '13px 12px' }}>
        <RiskBadge category={project.risk_category} score={project.risk_score ?? undefined} size="sm" />
      </td>
      <td className="hidden lg:table-cell" style={{ padding: '13px 12px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {formatCrore(project.orig_cost_cr)}
      </td>
      <td className="hidden md:table-cell" style={{ padding: '13px 12px', whiteSpace: 'nowrap' }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          color: project.delay_months && project.delay_months > 0 ? '#f87171' : '#4ade80',
        }}>
          {formatDelayMonths(project.delay_months)}
        </span>
      </td>
      <td className="hidden xl:table-cell" style={{ padding: '13px 12px', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {formatDate(project.approval_date)}
      </td>
      <td style={{ padding: '13px 16px 13px 12px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 600, opacity: hovered ? 1 : 0, transition: 'opacity 120ms ease' }}>
          View →
        </span>
      </td>
    </tr>
  );
};

export default ProjectExplorer;
