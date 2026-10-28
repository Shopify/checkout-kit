// Keep normal runs varied; fast-check reports the seed and shrink path on failure.
export function propertyOptions() {
  const numRuns = integerEnvironmentVariable('FC_NUM_RUNS', 200)!;
  const seed = integerEnvironmentVariable('FC_SEED');
  const path = process.env.FC_PATH;

  if (numRuns < 1) throw new Error('FC_NUM_RUNS must be positive');
  if (path !== undefined && seed === undefined) {
    throw new Error('FC_PATH requires FC_SEED to replay the same generated case');
  }

  return {
    numRuns,
    ...(seed === undefined ? {} : {seed}),
    ...(path === undefined ? {} : {path}),
  };
}

function integerEnvironmentVariable(name: string, fallback?: number) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isSafeInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  return value;
}
