// Seatbelt against running development or destructive database commands on a
// shared database. A target is disposable only if it is local or explicitly
// named in DISPATCH_DISPOSABLE_DB_HOSTS. Anything unrecognised is refused.
type Env = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function isDisposableDatabaseUrl(url: string, env: Env = process.env): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) return false;
  // `?host=` overrides the authority; only a local socket directory is accepted.
  const override = parsed.searchParams.get('host');
  if (override !== null && !override.startsWith('/') && !LOCAL_HOSTS.has(override)) return false;
  const named = (env.DISPATCH_DISPOSABLE_DB_HOSTS ?? '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
  const host = parsed.hostname.toLowerCase();
  return LOCAL_HOSTS.has(host) || named.includes(host);
}

export function assertDisposableDatabase(urls: Array<string | undefined>, env: Env = process.env, action = 'this command'): void {
  const targets = urls.filter((url): url is string => Boolean(url));
  if (env.VERCEL_ENV === 'production') throw new Error(`refusing to run ${action}: production environment`);
  if (targets.length === 0) throw new Error(`refusing to run ${action}: no database target to verify`);
  if (!targets.every((url) => isDisposableDatabaseUrl(url, env))) {
    // Never echo the URL: it carries credentials.
    throw new Error(`refusing to run ${action}: the database is not local or listed in DISPATCH_DISPOSABLE_DB_HOSTS`);
  }
}

const URL_FLAGS = ['--url', '--shadow-database-url'];

function flagValues(args: string[], flag: string): string[] {
  return args.flatMap((arg, index) => arg === flag ? [args[index + 1] ?? ''] : arg.startsWith(`${flag}=`) ? [arg.slice(flag.length + 1)] : []);
}

// Allowlist of Prisma commands that cannot rewrite data or schema, plus
// `migrate deploy`/`resolve`, the reviewed release path.
export function guardPrismaCommand(args: string[], env: Env = process.env): void {
  const [command, subcommand] = args.filter((arg) => !arg.startsWith('-'));
  if (command === undefined || ['generate', 'validate', 'format', 'version'].includes(command)) return;
  if (command === 'db' && subcommand === 'pull') return;
  if (command === 'migrate' && ['deploy', 'status', 'resolve'].includes(subcommand ?? '')) return;
  const action = `prisma ${[command, subcommand].filter((part) => part && /^[a-z-]+$/.test(part)).join(' ')}`;
  if (command === 'migrate' && subcommand === 'diff') {
    // Read-only unless a shadow database, which Prisma wipes, is named.
    const shadow = [...flagValues(args, '--shadow-database-url'), env.SHADOW_DATABASE_URL].filter(Boolean);
    if (shadow.length > 0) assertDisposableDatabase(shadow, env, action);
    return;
  }
  const explicit = URL_FLAGS.flatMap((flag) => flagValues(args, flag));
  assertDisposableDatabase([env.DATABASE_URL, env.DIRECT_URL, env.SHADOW_DATABASE_URL, ...explicit], env, action);
}
