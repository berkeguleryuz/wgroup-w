export type PostgresSslOptions =
  | { rejectUnauthorized: true; ca: string }
  | { rejectUnauthorized: false }
  | undefined;

export function resolvePostgresSsl(options: {
  connectionString?: string;
  mode?: string;
  caBase64?: string;
  onWarning?: (message: string) => void;
}): PostgresSslOptions;
