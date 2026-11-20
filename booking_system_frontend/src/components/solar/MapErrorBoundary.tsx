import { Component } from 'react';
import type { ReactNode } from 'react';

interface MapErrorBoundaryProps {
  children: ReactNode;
  /** Called once when the map throws, so the page can fall back to the list view. */
  onError: (error: Error) => void;
}

interface MapErrorBoundaryState {
  failed: boolean;
}

/** Catches a failed chunk load, a lost WebGL context or a scene error. Renders nothing; the page shows the list instead. */
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('Solar map failed, falling back to the list view:', error);
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
