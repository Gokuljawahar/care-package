import type { ComponentType } from 'react';
import * as objects from './objects';
import * as places from './places';
import * as scenes from './scenes';

// svgComponentName (from shared/prompts.ts) -> component.
const PICTURES: Record<string, ComponentType> = {
  ...objects,
  ...places,
  ...scenes,
};

export const Picture = ({ name }: { name: string }) => {
  const Svg = PICTURES[name];
  return Svg ? <Svg /> : null;
};
