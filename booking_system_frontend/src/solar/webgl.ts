/** True if this browser can create a WebGL context. The map falls back to the list view otherwise. */
export const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};
