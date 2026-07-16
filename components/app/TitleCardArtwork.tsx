import Image from "next/image";

const palette = [
  "linear-gradient(135deg, var(--surface-dark) 0%, var(--cinema-700) 100%)",
  "linear-gradient(135deg, var(--cinema-800) 0%, var(--cinema-600) 100%)",
  "linear-gradient(135deg, var(--muted-foreground) 0%, var(--surface-dark) 100%)",
  "linear-gradient(135deg, var(--surface-dark) 0%, var(--cinema-600) 100%)",
];

export function TitleCardArtwork({
  src,
  alt,
  index,
  sizes,
  className = "object-cover",
}: {
  src: string | null;
  alt: string;
  index: number;
  sizes: string;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{ background: palette[index % palette.length] }}
    />
  );
}
