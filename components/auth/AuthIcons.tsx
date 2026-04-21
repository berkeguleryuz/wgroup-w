export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path
        d="M19.6 10.23c0-.68-.06-1.36-.18-2.02H10v3.82h5.4a4.63 4.63 0 0 1-2 3.04v2.52h3.23c1.9-1.75 2.97-4.32 2.97-7.36z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 4.97-.9 6.63-2.4l-3.23-2.52c-.9.6-2.04.96-3.4.96-2.61 0-4.83-1.77-5.62-4.14H1.03v2.6A10 10 0 0 0 10 20z"
        fill="#34A853"
      />
      <path
        d="M4.38 11.9a6 6 0 0 1 0-3.8v-2.6H1.03a10 10 0 0 0 0 9l3.35-2.6z"
        fill="#FBBC04"
      />
      <path
        d="M10 3.96c1.47 0 2.78.5 3.82 1.5l2.86-2.85A10 10 0 0 0 1.03 5.5l3.35 2.6C5.17 5.74 7.39 3.96 10 3.96z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3 L17 17" />
      <path d="M8.5 5.1A8.3 8.3 0 0 1 10 5c5 0 8 6 8 6a13 13 0 0 1-2.5 3.1" />
      <path d="M15.5 15.5A8.3 8.3 0 0 1 10 16c-5 0-8-6-8-6a13 13 0 0 1 3.2-3.5" />
      <path d="M11.8 11.8A2.5 2.5 0 1 1 8.2 8.2" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6 L10 11" />
      <path d="M10 14 L10 14.01" />
    </svg>
  );
}

export function SuccessIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M6.5 10.5 L9 13 L14 7.5" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M3 5.5 L10 11 L17 5.5" />
    </svg>
  );
}
