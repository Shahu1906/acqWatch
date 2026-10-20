import React from 'react';

interface AcqWatchLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const AcqWatchLogoMark: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none group ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background ambient glow */}
      <div
        style={{
          position: 'absolute',
          inset: '-2px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.4), rgba(6, 182, 212, 0.3), rgba(16, 185, 129, 0.2))',
          filter: 'blur(8px)',
          opacity: 0.6,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          pointerEvents: 'none',
        }}
        className="group-hover:opacity-100 group-hover:scale-105"
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'relative',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className="group-hover:scale-105"
      >
        <defs>
          {/* Main Shield / Prism Gradient */}
          <linearGradient id="acq-prism" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="35%" stopColor="#2563eb" />
            <stop offset="70%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>

          {/* Top Facet (Sunlight / Satellite reflection) */}
          <linearGradient id="acq-facet-top" x1="24" y1="6" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
          </linearGradient>

          {/* Core Radar Beam Gradient */}
          <linearGradient id="acq-beam" x1="12" y1="24" x2="36" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>

          {/* Outer Border Stroke */}
          <linearGradient id="acq-border" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
          </linearGradient>

          {/* Pulse Glow Filter */}
          <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Isometric Hexagonal Land Parcel */}
        <path
          d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
          fill="url(#acq-prism)"
          stroke="url(#acq-border)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* 2. Top Cadastral Polygon (Territory parcel 1) */}
        <path
          d="M24 4L42 14L24 24L6 14L24 4Z"
          fill="url(#acq-facet-top)"
          opacity="0.65"
        />

        {/* 3. Internal Parcel Division Line (cadastral boundary) */}
        <path
          d="M24 24V44M24 24L42 14M24 24L6 14"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* 4. Concentric Surveillance Radar Rings (AcqWatch sensor aperture) */}
        <circle
          cx="24"
          cy="24"
          r="10"
          stroke="rgba(56, 189, 248, 0.45)"
          strokeWidth="1"
          strokeDasharray="2 3"
          fill="none"
        />
        <circle
          cx="24"
          cy="24"
          r="5"
          stroke="rgba(52, 211, 153, 0.6)"
          strokeWidth="1"
          fill="none"
        />

        {/* 5. Central Dynamic "A" Target Reticle (Acquisition Vertex) */}
        <path
          d="M24 15L31 29H27.5L25.8 25.5H22.2L20.5 29H17L24 15Z"
          fill="#ffffff"
          filter="url(#radar-glow)"
        />
        {/* Horizontal crosshair bar inside A */}
        <line
          x1="22.6"
          y1="24.2"
          x2="25.4"
          y2="24.2"
          stroke="#0284c7"
          strokeWidth="1.2"
        />

        {/* 6. Active Acquisition GPS Pulse Dot (Predictive beacon) */}
        <circle
          cx="24"
          cy="20.5"
          r="2.2"
          fill="#34d399"
          filter="url(#radar-glow)"
        />
        <circle
          cx="24"
          cy="20.5"
          r="1"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
};

export const AcqWatchBrand: React.FC<AcqWatchLogoProps> = ({
  size = 36,
  className = '',
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <AcqWatchLogoMark size={size} />

      {showText && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Acq
            </span>
            <span
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              Watch
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '1px 5px',
                borderRadius: '4px',
                marginLeft: '4px',
                lineHeight: '1.2',
                textTransform: 'uppercase',
              }}
            >
              v2.0
            </span>
          </div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginTop: '3px',
              lineHeight: 1,
            }}
          >
            Infrastructure Risk Radar
          </div>
        </div>
      )}
    </div>
  );
};

export default AcqWatchBrand;
