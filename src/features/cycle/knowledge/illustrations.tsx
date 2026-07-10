// Ilustrações vetoriais minimalistas para o Centro de Conhecimento.
// Sem fotografias, sem emojis — apenas SVG puro com gradientes suaves.

export function IllustrationCycle({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="gc1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#fecdd3" strokeWidth="6" />
      <path d="M50 12 A38 38 0 0 1 88 50" fill="none" stroke="url(#gc1)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="12" r="4" fill="#fb7185" />
      <circle cx="50" cy="50" r="10" fill="#fecdd3" />
      <circle cx="50" cy="50" r="5" fill="#fb7185" />
    </svg>
  );
}

export function IllustrationPeriod({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="gp1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="56" rx="22" ry="26" fill="url(#gp1)" opacity="0.85" />
      <path d="M50 18 C50 18 34 36 34 50 C34 59 41 65 50 65 C59 65 66 59 66 50 C66 36 50 18 50 18Z" fill="url(#gp1)" opacity="0.6" />
      <circle cx="50" cy="50" r="8" fill="#fff" opacity="0.3" />
    </svg>
  );
}

export function IllustrationOvulation({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <radialGradient id="go1" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="20" fill="url(#go1)" opacity="0.9" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#6ee7b7" strokeWidth="2" opacity="0.5" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#6ee7b7" strokeWidth="1" opacity="0.3" />
      {[0,60,120,180,240,300].map((deg, i) => {
        const r = 44;
        const x = 50 + r * Math.cos((deg * Math.PI) / 180);
        const y = 50 + r * Math.sin((deg * Math.PI) / 180);
        return <circle key={i} cx={x} cy={y} r="3" fill="#6ee7b7" opacity="0.6" />;
      })}
    </svg>
  );
}

export function IllustrationFollicular({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="gf1" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
      <rect x="46" y="60" width="8" height="30" rx="4" fill="url(#gf1)" />
      <ellipse cx="50" cy="50" rx="16" ry="18" fill="#7dd3fc" opacity="0.8" />
      <ellipse cx="42" cy="42" rx="8" ry="10" fill="#bae6fd" opacity="0.7" transform="rotate(-20 42 42)" />
      <circle cx="50" cy="30" r="5" fill="#0ea5e9" opacity="0.6" />
    </svg>
  );
}

export function IllustrationLuteal({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="gl1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M50 20 A30 30 0 0 1 80 50 A30 30 0 0 1 50 20Z" fill="#c4b5fd" opacity="0.5" />
      <circle cx="50" cy="50" r="22" fill="url(#gl1)" opacity="0.7" />
      <circle cx="50" cy="50" r="10" fill="#ede9fe" opacity="0.6" />
      <circle cx="62" cy="30" r="4" fill="#c4b5fd" />
      <circle cx="72" cy="42" r="2.5" fill="#c4b5fd" opacity="0.7" />
      <circle cx="58" cy="24" r="2" fill="#c4b5fd" opacity="0.5" />
    </svg>
  );
}

export function IllustrationFertility({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="gfe1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="52" rx="26" ry="30" fill="url(#gfe1)" opacity="0.7" />
      <ellipse cx="50" cy="48" rx="16" ry="20" fill="#d1fae5" opacity="0.8" />
      <circle cx="50" cy="44" r="8" fill="#34d399" opacity="0.9" />
    </svg>
  );
}

export function IllustrationHealth({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="gh1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f9a8d4" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path
        d="M50 75 C50 75 20 56 20 38 C20 28 28 20 38 20 C44 20 50 24 50 24 C50 24 56 20 62 20 C72 20 80 28 80 38 C80 56 50 75 50 75Z"
        fill="url(#gh1)" opacity="0.8"
      />
      <path
        d="M50 65 C50 65 28 52 28 38 C28 32 33 26 40 26 C45 26 50 30 50 30"
        fill="none" stroke="#fff" strokeWidth="2" opacity="0.4" strokeLinecap="round"
      />
    </svg>
  );
}

export function IllustrationEmotions({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="gem1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M20 60 Q35 30 50 50 Q65 70 80 40" fill="none" stroke="url(#gem1)" strokeWidth="5" strokeLinecap="round" />
      <path d="M20 70 Q35 45 50 62 Q65 79 80 55" fill="none" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <circle cx="20" cy="60" r="4" fill="#7c3aed" />
      <circle cx="80" cy="40" r="4" fill="#7c3aed" />
    </svg>
  );
}

export function IllustrationPregnancy({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <radialGradient id="gpr1" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fecdd3" />
          <stop offset="100%" stopColor="#fb7185" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="55" rx="28" ry="34" fill="url(#gpr1)" opacity="0.7" />
      <circle cx="50" cy="42" r="16" fill="#fff" opacity="0.3" />
      <ellipse cx="50" cy="48" rx="10" ry="12" fill="#fda4af" opacity="0.8" />
      <circle cx="50" cy="44" r="5" fill="#f43f5e" opacity="0.7" />
    </svg>
  );
}

export function IllustrationFaq({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="36" fill="#f1f5f9" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#cbd5e1" strokeWidth="2" />
      <text x="50" y="64" textAnchor="middle" fontSize="42" fontWeight="bold" fill="#64748b">?</text>
    </svg>
  );
}

// Ilustração grande para o card de entrada
export function IllustrationKnowledgeCenter({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="gkc1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fecdd3" />
          <stop offset="100%" stopColor="#fda4af" />
        </linearGradient>
        <linearGradient id="gkc2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="gkc3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="gkc4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>

      {/* Anel exterior */}
      <circle cx="60" cy="60" r="50" fill="none" stroke="#fecdd3" strokeWidth="3" opacity="0.5" />

      {/* Quatro quadrantes de fase */}
      <path d="M60 10 A50 50 0 0 1 110 60" fill="none" stroke="url(#gkc2)" strokeWidth="8" strokeLinecap="round" />
      <path d="M110 60 A50 50 0 0 1 60 110" fill="none" stroke="url(#gkc3)" strokeWidth="8" strokeLinecap="round" />
      <path d="M60 110 A50 50 0 0 1 10 60" fill="none" stroke="url(#gkc4)" strokeWidth="8" strokeLinecap="round" />
      <path d="M10 60 A50 50 0 0 1 60 10" fill="none" stroke="url(#gkc1)" strokeWidth="8" strokeLinecap="round" />

      {/* Centro */}
      <circle cx="60" cy="60" r="22" fill="white" opacity="0.9" />
      <circle cx="60" cy="60" r="14" fill="url(#gkc1)" opacity="0.7" />
      <circle cx="60" cy="60" r="7" fill="#fb7185" />

      {/* Pontos nos quadrantes */}
      <circle cx="60" cy="12" r="4" fill="#34d399" />
      <circle cx="108" cy="60" r="4" fill="#a78bfa" />
      <circle cx="60" cy="108" r="4" fill="#7dd3fc" />
      <circle cx="12" cy="60" r="4" fill="#fb7185" />
    </svg>
  );
}

// Mapa de ilustrações por chave
export const ILLUSTRATIONS: Record<string, React.FC<{ className?: string }>> = {
  cycle:       IllustrationCycle,
  period:      IllustrationPeriod,
  ovulation:   IllustrationOvulation,
  follicular:  IllustrationFollicular,
  luteal:      IllustrationLuteal,
  fertility:   IllustrationFertility,
  health:      IllustrationHealth,
  emotions:    IllustrationEmotions,
  pregnancy:   IllustrationPregnancy,
  faq:         IllustrationFaq,
};
