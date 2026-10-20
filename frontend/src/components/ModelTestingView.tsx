import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  IndianRupee,
  Layers,
  Building,
  MapPin,
  Calendar,
  Info,
  HelpCircle,
  Activity,
  Zap,
} from 'lucide-react';
import { predictAdHoc, fetchFilters } from '../api';
import type { AdHocPredictRequest, AdHocPredictResponse, FiltersResponse } from '../types';
import { Spinner, ModelDisclaimer } from './ui';

const POPULAR_AGENCIES = [
  'NHAI',
  'MoRTH',
  'DFCCIL',
  'BMRCL',
  'DMRC',
  'RVNL',
  'PGCIL',
  'NTPC',
  'IRCON',
  'KRCL',
  'MMRDA',
  'CIDCO',
  'NHIDCL',
  'AAI',
  'IOCL',
  'ONGC',
  'GAIL',
  'BRO',
  'CPWD',
];

const DEFAULT_SECTORS = [
  'ROAD TRANSPORT AND HIGHWAYS',
  'RAILWAYS',
  'POWER',
  'PETROLEUM',
  'URBAN DEVELOPMENT',
  'COAL',
  'SHIPPING AND PORTS',
  'CIVIL AVIATION',
  'MINES',
  'TELECOMMUNICATIONS',
  'STEEL',
  'FERTILIZERS',
];

const DEFAULT_STATES = [
  'ANDHRA PRADESH',
  'ASSAM',
  'BIHAR',
  'CHHATTISGARH',
  'DELHI',
  'GOA',
  'GUJARAT',
  'HARYANA',
  'HIMACHAL PRADESH',
  'JAMMU AND KASHMIR',
  'JHARKHAND',
  'KARNATAKA',
  'KERALA',
  'MADHYA PRADESH',
  'MAHARASHTRA',
  'ODISHA',
  'PUNJAB',
  'RAJASTHAN',
  'TAMIL NADU',
  'TELANGANA',
  'UTTAR PRADESH',
  'UTTARAKHAND',
  'WEST BENGAL',
];

const PRESET_EXAMPLES = [
  {
    name: 'NHAI Express Highway (High Cost / Complex)',
    sector: 'ROAD TRANSPORT AND HIGHWAYS',
    agency: 'NHAI',
    state: 'MAHARASHTRA',
    orig_cost_cr: 3200,
    planned_duration_months: 48,
    approval_year: 2023,
    approval_month: 3,
  },
  {
    name: 'Dedicated Freight Rail Corridor',
    sector: 'RAILWAYS',
    agency: 'DFCCIL',
    state: 'UTTAR PRADESH',
    orig_cost_cr: 5400,
    planned_duration_months: 60,
    approval_year: 2022,
    approval_month: 6,
  },
  {
    name: 'Metro Rail Phase Extension',
    sector: 'URBAN DEVELOPMENT',
    agency: 'BMRCL',
    state: 'KARNATAKA',
    orig_cost_cr: 1850,
    planned_duration_months: 36,
    approval_year: 2024,
    approval_month: 1,
  },
  {
    name: 'Solar Power Transmission Grid',
    sector: 'POWER',
    agency: 'PGCIL',
    state: 'RAJASTHAN',
    orig_cost_cr: 650,
    planned_duration_months: 24,
    approval_year: 2024,
    approval_month: 4,
  },
];

export const ModelTestingView: React.FC = () => {
  const [formData, setFormData] = useState<AdHocPredictRequest>({
    sector: 'ROAD TRANSPORT AND HIGHWAYS',
    agency: 'NHAI',
    state: 'MAHARASHTRA',
    orig_cost_cr: 1500,
    planned_duration_months: 36,
    approval_year: 2023,
    approval_month: 5,
  });

  const [filterOptions, setFilterOptions] = useState<FiltersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AdHocPredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Controller for canceling rapid in-flight requests during debounce
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchFilters()
      .then(setFilterOptions)
      .catch((err) => console.warn('Could not load filter catalogs:', err));
  }, []);

  // Build full sorted agency list: incorporates backend catalogue + guaranteed NHAI + high-volume agencies
  const agencyList = useMemo(() => {
    const set = new Set<string>();
    POPULAR_AGENCIES.forEach((a) => set.add(a));
    if (filterOptions?.agencies) {
      filterOptions.agencies.forEach((a) => {
        if (a && a.trim()) set.add(a.trim());
      });
    }
    if (formData.agency) {
      set.add(formData.agency);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filterOptions?.agencies, formData.agency]);

  const sectorList = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_SECTORS.forEach((s) => set.add(s));
    if (filterOptions?.sectors) {
      filterOptions.sectors.forEach((s) => {
        if (s && s.trim()) set.add(s.trim());
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filterOptions?.sectors]);

  const stateList = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_STATES.forEach((st) => set.add(st));
    if (filterOptions?.states) {
      filterOptions.states.forEach((st) => {
        if (st && st.trim()) set.add(st.trim());
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filterOptions?.states]);

  // Core inference function
  const runPrediction = useCallback(async (data: AdHocPredictRequest) => {
    if (!data.sector || !data.agency || !data.state || !data.orig_cost_cr || data.orig_cost_cr <= 0) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await predictAdHoc(data, controller.signal);
      setResult(response);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Model prediction inference failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run reactive inference whenever any single form field changes (280ms debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      runPrediction(formData);
    }, 280);

    return () => clearTimeout(timer);
  }, [formData, runPrediction]);

  const handleApplyPreset = (preset: typeof PRESET_EXAMPLES[0]) => {
    setFormData({
      sector: preset.sector,
      agency: preset.agency,
      state: preset.state,
      orig_cost_cr: preset.orig_cost_cr,
      planned_duration_months: preset.planned_duration_months,
      approval_year: preset.approval_year,
      approval_month: preset.approval_month,
    });
    // Reactive effect will automatically compute new prediction
  };

  const handleRunTest = (e: React.FormEvent) => {
    e.preventDefault();
    runPrediction(formData);
  };

  const handleReset = () => {
    setFormData({
      sector: 'ROAD TRANSPORT AND HIGHWAYS',
      agency: 'NHAI',
      state: 'MAHARASHTRA',
      orig_cost_cr: 1500,
      planned_duration_months: 36,
      approval_year: 2023,
      approval_month: 5,
    });
  };

  return (
    <div className="view-enter max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5" />
              Interactive Inference Engine
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-Time Reactive Inference
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Model Testing &amp; Delay Simulation
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Test custom or hypothetical project parameters directly against the trained Gradient Boosting model.
            Predictions automatically update in real-time as you tweak parameters.
          </p>
        </div>

        {/* Presets & Reset */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary btn-sm flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Preset Quick Load Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          Quick Test Templates (Click to load scenario):
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESET_EXAMPLES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
            >
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                {preset.name}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                <span>{preset.state}</span>
                <span className="font-semibold text-slate-700">₹{preset.orig_cost_cr} Cr</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Project Attributes &amp; Baseline Specifications
            </h2>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Live sync
            </span>
          </div>

          <form onSubmit={handleRunTest} className="space-y-4">
            {/* Sector & Agency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Sector
                </label>
                <select
                  className="input-base text-xs sm:text-sm w-full font-medium"
                  value={formData.sector}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sector: e.target.value }))}
                  required
                >
                  {sectorList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    Implementing Agency
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 uppercase">NHAI Available</span>
                </label>
                <select
                  className="input-base text-xs sm:text-sm w-full font-medium"
                  value={formData.agency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, agency: e.target.value }))}
                  required
                >
                  <optgroup label="Key / High-Priority Agencies">
                    <option value="NHAI">NHAI (National Highways Authority of India)</option>
                    <option value="MoRTH">MoRTH (Road Transport &amp; Highways)</option>
                    <option value="DFCCIL">DFCCIL (Dedicated Freight Corridor)</option>
                    <option value="BMRCL">BMRCL (Bangalore Metro Rail)</option>
                    <option value="PGCIL">PGCIL (Power Grid Corporation)</option>
                    <option value="RVNL">RVNL (Rail Vikas Nigam Limited)</option>
                    <option value="NTPC">NTPC (National Thermal Power Corp)</option>
                    <option value="DMRC">DMRC (Delhi Metro Rail Corp)</option>
                  </optgroup>
                  <optgroup label="All Agencies">
                    {agencyList.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* State & Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  State / Territory
                </label>
                <select
                  className="input-base text-xs sm:text-sm w-full font-medium"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  required
                >
                  {stateList.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                    Sanctioned Cost (₹ Crores)
                  </span>
                  <span className="text-[10px] text-slate-400">Updates dynamically</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="1"
                  className="input-base text-xs sm:text-sm w-full font-semibold"
                  value={formData.orig_cost_cr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, orig_cost_cr: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
            </div>

            {/* Duration & Approval Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Planned Duration (Mo.)
                </label>
                <input
                  type="number"
                  min="1"
                  max="240"
                  className="input-base text-xs sm:text-sm w-full font-medium"
                  value={formData.planned_duration_months || 36}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      planned_duration_months: parseFloat(e.target.value) || 36,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Approval Year
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2035"
                  className="input-base text-xs sm:text-sm w-full font-medium"
                  value={formData.approval_year || 2023}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      approval_year: parseInt(e.target.value, 10) || 2023,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Approval Month (1-12)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="input-base text-xs sm:text-sm w-full font-medium"
                  value={formData.approval_month || 6}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      approval_month: parseInt(e.target.value, 10) || 6,
                    }))
                  }
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    <span>Computing ML Inference…</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current text-amber-300" />
                    <span>Run Inference Immediate</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-5 flex flex-col">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-xs mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <span className="font-bold">Prediction Notice:</span> {error}
              </div>
            </div>
          )}

          {result ? (
            <div
              className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between flex-1 transition-all duration-300 ${
                loading ? 'opacity-70 scale-[0.99]' : 'opacity-100 scale-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Model Inference Result
                    </span>
                    {loading && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                        <Spinner size="sm" />
                        Updating…
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {result.model_id || 'GradientBoosting'}
                  </span>
                </div>

                {/* Score & Risk Badge */}
                <div className="my-6 text-center">
                  <div
                    className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 shadow-sm mb-3 transition-transform"
                    style={{
                      borderColor: result.badge_color || '#3b82f6',
                      backgroundColor: `${result.badge_color || '#3b82f6'}15`,
                    }}
                  >
                    <span className="text-3xl font-extrabold" style={{ color: result.badge_color || '#1e293b' }}>
                      {result.risk_score != null ? result.risk_score : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold tracking-wide text-white uppercase shadow-sm"
                      style={{ backgroundColor: result.badge_color || '#3b82f6' }}
                    >
                      {result.badge_label || result.risk_category || 'ASSESSED'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto mt-3">
                    {result.description}
                  </p>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-center">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Delay Probability</div>
                    <div className="text-base font-extrabold text-slate-800 mt-0.5">
                      {result.probability != null ? `${(result.probability * 100).toFixed(1)}%` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Projected Outcome</div>
                    <div className="text-base font-extrabold mt-0.5">
                      {result.risk_category === 'LOW' ? (
                        <span className="text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> On-Time
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center justify-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Likely Delay
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[11px] text-slate-500 bg-blue-50/60 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    Target encoding applied for agency <strong>{formData.agency}</strong> &amp; state{' '}
                    <strong>{formData.state}</strong>, one-hot transformation on sector{' '}
                    <strong>{formData.sector}</strong>, and log cost scaling.
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <ModelDisclaimer text={result.disclaimer} />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center flex-1 min-h-[360px]">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                <Play className="w-5 h-5 ml-0.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Calculating Model Inference…</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Real-time ML delay risk calculation is loading automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelTestingView;
