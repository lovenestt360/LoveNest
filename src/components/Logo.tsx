/**
 * LoveNest Logo System
 * Brand colors: Pink #FF6B8F · Blue #4D7CFE · Navy #0B1324
 *
 * LogoMark  — symbol only (icons, small spaces)
 * LogoFull  — symbol + wordmark (headers, landing)
 * LogoIcon  — square icon with rounded corners (app icon style)
 */

// ── Symbol mark — two crescents facing each other ─────────────────────────────

export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LoveNest"
    >
      <defs>
        {/* Pink crescent mask — outer ellipse minus right-offset inner ellipse */}
        <mask id="ln-pink-mask">
          <rect width="512" height="512" fill="black" />
          <ellipse cx="198" cy="265" rx="115" ry="195" fill="white" />
          <ellipse cx="256" cy="252" rx="97" ry="172" fill="black" />
        </mask>
        {/* Blue crescent mask — mirror of pink */}
        <mask id="ln-blue-mask">
          <rect width="512" height="512" fill="black" />
          <ellipse cx="314" cy="265" rx="115" ry="195" fill="white" />
          <ellipse cx="256" cy="252" rx="97" ry="172" fill="black" />
        </mask>
      </defs>

      {/* Pink left crescent */}
      <rect width="512" height="512" fill="#FF6B8F" mask="url(#ln-pink-mask)" />
      {/* Blue right crescent */}
      <rect width="512" height="512" fill="#4D7CFE" mask="url(#ln-blue-mask)" />
    </svg>
  );
}

// ── App icon — symbol on navy rounded square ──────────────────────────────────

export function LogoIcon({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LoveNest"
    >
      <rect width="512" height="512" rx="112" fill="#0B1324" />
      <defs>
        <mask id="li-pink-mask">
          <rect width="512" height="512" fill="black" />
          <ellipse cx="198" cy="265" rx="115" ry="195" fill="white" />
          <ellipse cx="256" cy="252" rx="97" ry="172" fill="black" />
        </mask>
        <mask id="li-blue-mask">
          <rect width="512" height="512" fill="black" />
          <ellipse cx="314" cy="265" rx="115" ry="195" fill="white" />
          <ellipse cx="256" cy="252" rx="97" ry="172" fill="black" />
        </mask>
      </defs>
      <rect width="512" height="512" fill="#FF6B8F" mask="url(#li-pink-mask)" />
      <rect width="512" height="512" fill="#4D7CFE" mask="url(#li-blue-mask)" />
    </svg>
  );
}

// ── Full logo — symbol + wordmark ─────────────────────────────────────────────

export function LogoFull({
  size = 36,
  className = "",
  dark = false,
}: {
  size?: number;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        style={{
          fontSize: size * 0.44,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: dark ? "#0B1324" : "#0B1324",
          lineHeight: 1,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        LoveNest
      </span>
    </div>
  );
}

// ── Nav variant — compact, for sticky headers ─────────────────────────────────

export function LogoNav({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={28} />
      <span className="text-[15px] font-bold tracking-tight text-foreground">
        LoveNest
      </span>
    </div>
  );
}
