export type Prompt = {
  id: string;
  title: string;
  /** Name of the SVG component in src/client/pictures. */
  svgComponentName: string;
};

export const PROMPTS: Prompt[] = [
  { id: 'keyboard', title: 'Tap the most annoying key', svgComponentName: 'Keyboard' },
];

export const promptById = (id: string): Prompt | undefined =>
  PROMPTS.find((p) => p.id === id);
