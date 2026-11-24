import { useMemo } from 'react';
import clsx from 'clsx';
import { BODY_STYLE } from '../../solar/bodyStyle';
import { bodyIdForName } from '../../solar/flights';
import { orbImage } from '../../solar/orbs';

interface PlanetOrbProps {
  /** Body name as it appears on flights and destinations, e.g. "Mars". */
  name: string;
  /** Diameter in CSS pixels. */
  size?: number;
  /** Soft halo in the body's colour. Off for the tiny orbs in dense lists. */
  glow?: boolean;
  className?: string;
}

/** A planet as it looks on the solar map, as a small image. Unknown names get a neutral disc. */
export const PlanetOrb = ({ name, size = 48, glow = true, className }: PlanetOrbProps) => {
  const id = bodyIdForName(name);
  const src = useMemo(() => (id ? orbImage(id) : ''), [id]);

  if (!id || !src) {
    return (
      <span
        aria-hidden
        className={clsx('inline-block shrink-0 rounded-full bg-white/20', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      width={size}
      height={size}
      className={clsx('shrink-0 select-none', className)}
      style={glow ? { filter: `drop-shadow(0 0 ${Math.round(size * 0.2)}px ${BODY_STYLE[id].color}80)` } : undefined}
    />
  );
};
