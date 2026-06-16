// Monotonic, collision-resistant id generator. Combines a process-local counter
// with a timestamp and a short random suffix so ids are unique even within the
// same millisecond. Pure — the only module-level state is the sequence counter.

let _seq = 0;

export function uid(prefix: string): string {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
