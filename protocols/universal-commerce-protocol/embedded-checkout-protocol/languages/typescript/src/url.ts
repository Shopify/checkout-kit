import {SPEC_VERSION, type Delegation} from './generated/ProtocolNotifications';

const EC_VERSION_PARAM = 'ec_version';
const EC_DELEGATE_PARAM = 'ec_delegate';
const EC_AUTH_PARAM = 'ec_auth';
const EC_COLOR_SCHEME_PARAM = 'ec_color_scheme';

const PROTOCOL_QUERY_PARAMS = new Set([
  EC_VERSION_PARAM,
  EC_DELEGATE_PARAM,
  EC_AUTH_PARAM,
  EC_COLOR_SCHEME_PARAM,
]);

export interface ProtocolURLOptions {
  readonly delegations?: readonly Delegation[];
  readonly colorScheme?: string;
  readonly auth?: string;
}

function queryParameterName(part: string): string {
  const name = part.split('=')[0] ?? '';
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export function url(input: string, options: ProtocolURLOptions = {}): string {
  const hashIndex = input.indexOf('#');
  const fragment = hashIndex === -1 ? '' : input.slice(hashIndex);
  const withoutFragment = hashIndex === -1 ? input : input.slice(0, hashIndex);

  const queryIndex = withoutFragment.indexOf('?');
  const base =
    queryIndex === -1 ? withoutFragment : withoutFragment.slice(0, queryIndex);
  const rawQuery =
    queryIndex === -1 ? '' : withoutFragment.slice(queryIndex + 1);

  const params = rawQuery
    .split('&')
    .filter(part => part.length > 0)
    .filter(part => !PROTOCOL_QUERY_PARAMS.has(queryParameterName(part)));

  params.push(`${EC_VERSION_PARAM}=${SPEC_VERSION}`);

  const delegations = options.delegations ?? [];
  if (delegations.length > 0) {
    const value = delegations.map(encodeURIComponent).join(',');
    params.push(`${EC_DELEGATE_PARAM}=${value}`);
  }

  if (options.auth !== undefined) {
    params.push(`${EC_AUTH_PARAM}=${encodeURIComponent(options.auth)}`);
  }

  if (options.colorScheme !== undefined) {
    params.push(
      `${EC_COLOR_SCHEME_PARAM}=${encodeURIComponent(options.colorScheme)}`,
    );
  }

  return `${base}?${params.join('&')}${fragment}`;
}
