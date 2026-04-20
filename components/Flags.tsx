type FlagProps = {
  className?: string;
  title?: string;
};

export function FlagTR({ className, title }: FlagProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={className}
      role="img"
      aria-label={title ?? "Türkçe"}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="24" height="16" fill="#E30A17" />
      <circle cx="9" cy="8" r="3.4" fill="#fff" />
      <circle cx="9.9" cy="8" r="2.7" fill="#E30A17" />
      <polygon
        points="13.2,6.2 13.75,7.55 15.2,7.55 14.05,8.45 14.5,9.8 13.2,9 11.9,9.8 12.35,8.45 11.2,7.55 12.65,7.55"
        fill="#fff"
      />
    </svg>
  );
}

export function FlagEN({ className, title }: FlagProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={className}
      role="img"
      aria-label={title ?? "English"}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* UK Union Jack */}
      <rect width="24" height="16" fill="#012169" />
      {/* White diagonals */}
      <path d="M0,0 L24,16 M24,0 L0,16" stroke="#fff" strokeWidth="3.2" />
      {/* Red diagonals */}
      <path
        d="M0,0 L24,16 M24,0 L0,16"
        stroke="#C8102E"
        strokeWidth="1.6"
        clipPath="inset(0)"
      />
      {/* White cross */}
      <path d="M12,0 V16 M0,8 H24" stroke="#fff" strokeWidth="4" />
      {/* Red cross */}
      <path d="M12,0 V16 M0,8 H24" stroke="#C8102E" strokeWidth="2" />
    </svg>
  );
}

export function FlagDE({ className, title }: FlagProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={className}
      role="img"
      aria-label={title ?? "Deutsch"}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="24" height="5.333" y="0" fill="#000" />
      <rect width="24" height="5.334" y="5.333" fill="#DD0000" />
      <rect width="24" height="5.333" y="10.667" fill="#FFCE00" />
    </svg>
  );
}

export function Flag({
  locale,
  className,
  title,
}: FlagProps & { locale: string }) {
  if (locale === "tr") return <FlagTR className={className} title={title} />;
  if (locale === "de") return <FlagDE className={className} title={title} />;
  return <FlagEN className={className} title={title} />;
}
