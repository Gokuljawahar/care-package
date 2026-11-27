import type { ComponentType } from 'react';
import { Keyboard } from './objects';
import { Blob, Cinema, EmojiGrid, Landscape } from './scenes';

// svgComponentName (from shared/prompts.ts) -> component.
const PICTURES: Record<string, ComponentType> = {
  Keyboard,
  Cinema,
  Landscape,
  EmojiGrid,
  Blob,
};

export const Picture = ({ name }: { name: string }) => {
  const Svg = PICTURES[name];
  return Svg ? <Svg /> : null;
};
