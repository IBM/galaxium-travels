/**
 * The simulation clock: one shared simulated time plus play state.
 *
 * It is a small external store rather than React state because the scene reads
 * the time every frame. The 3D objects read `getState()` inside the render loop
 * without re-rendering React; the scrubber subscribes with `useSyncExternalStore`.
 */

export interface ClockState {
  /** Current simulated time, epoch ms. */
  timeMs: number;
  startMs: number;
  endMs: number;
  playing: boolean;
  /** Simulated hours per real second. */
  speed: number;
}

export const SPEEDS = [1, 6, 24] as const;
const HOUR_MS = 3_600_000;

export interface SimClock {
  getState: () => ClockState;
  subscribe: (listener: () => void) => () => void;
  /** Advance by real elapsed seconds. Called once per rendered frame. */
  tick: (realSeconds: number) => void;
  setTime: (timeMs: number) => void;
  setRange: (startMs: number, endMs: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const createSimClock = (startMs = 0, endMs = 0): SimClock => {
  let state: ClockState = { timeMs: startMs, startMs, endMs, playing: false, speed: SPEEDS[1] };
  const listeners = new Set<() => void>();

  const update = (patch: Partial<ClockState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    tick: (realSeconds) => {
      if (!state.playing) return;
      const next = state.timeMs + realSeconds * state.speed * HOUR_MS;
      if (next >= state.endMs) update({ timeMs: state.endMs, playing: false });
      else update({ timeMs: next });
    },
    setTime: (timeMs) => update({ timeMs: clamp(timeMs, state.startMs, state.endMs) }),
    setRange: (start, end) => {
      if (start === state.startMs && end === state.endMs) return;
      // An empty range means the clock was never positioned, so start at the beginning.
      const fresh = state.startMs === state.endMs;
      update({ startMs: start, endMs: end, timeMs: fresh ? start : clamp(state.timeMs, start, end) });
    },
    setPlaying: (playing) => {
      // Pressing play at the end restarts from the beginning.
      if (playing && state.timeMs >= state.endMs) update({ playing, timeMs: state.startMs });
      else update({ playing });
    },
    setSpeed: (speed) => update({ speed }),
  };
};
