export type Prompt = {
  id: string;
  title: string;
  /** Name of the SVG component in src/client/pictures. */
  svgComponentName: string;
};

export const PROMPTS: Prompt[] = [
  { id: 'keyboard', title: 'Tap the most annoying key', svgComponentName: 'Keyboard' },
  { id: 'cinema', title: 'Pick your seat', svgComponentName: 'Cinema' },
  { id: 'sun', title: 'Where does the sun go?', svgComponentName: 'Landscape' },
  { id: 'emoji', title: 'Tap the best emoji', svgComponentName: 'EmojiGrid' },
  { id: 'centre', title: 'Tap the exact centre', svgComponentName: 'Blob' },
];

export const promptById = (id: string): Prompt | undefined =>
  PROMPTS.find((p) => p.id === id);
