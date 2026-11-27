import type { ComponentType } from 'react';
import { Keyboard } from './objects';

// svgComponentName (from shared/prompts.ts) -> component.
const PICTURES: Record<string, ComponentType> = {
  Keyboard,
};

export const Picture = ({ name }: { name: string }) => {
  const Svg = PICTURES[name];
  return Svg ? <Svg /> : null;
};
