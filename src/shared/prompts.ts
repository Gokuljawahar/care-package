export type Prompt = {
  id: string;
  title: string;
  /** Name of the SVG component in src/client/pictures. */
  svgComponentName: string;
  /** Divisive "worst/most annoying" prompts. Every day leads with one. */
  spicy?: true;
};

export const PROMPTS: Prompt[] = [
  {
    id: 'keyboard',
    title: 'Tap the most annoying key',
    svgComponentName: 'Keyboard',
  },
  { id: 'cinema', title: 'Pick your seat', svgComponentName: 'Cinema' },
  { id: 'sun', title: 'Where does the sun go?', svgComponentName: 'Landscape' },
  { id: 'emoji', title: 'Tap the best emoji', svgComponentName: 'EmojiGrid' },
  { id: 'centre', title: 'Tap the exact centre', svgComponentName: 'Blob' },
  { id: 'painting', title: 'Hang the painting', svgComponentName: 'Wall' },
  {
    id: 'parking',
    title: 'Pick your parking spot',
    svgComponentName: 'CarPark',
  },
  { id: 'pizza', title: 'Take the first slice', svgComponentName: 'Pizza' },
  { id: 'bus', title: 'Pick your bus seat', svgComponentName: 'Bus' },
  { id: 'dart', title: 'Throw one dart', svgComponentName: 'Dartboard' },
  {
    id: 'treasure',
    title: 'Where is the treasure buried?',
    svgComponentName: 'Island',
  },
  { id: 'app', title: 'Open the first app', svgComponentName: 'HomeScreen' },
  { id: 'book', title: 'Grab a book', svgComponentName: 'Bookshelf' },
  { id: 'nose', title: 'Where does the nose go?', svgComponentName: 'Face' },
  { id: 'lunch', title: 'Point to lunchtime', svgComponentName: 'Clock' },
  { id: 'lift', title: 'Press a button', svgComponentName: 'Lift' },
  { id: 'magnet', title: 'Stick the magnet', svgComponentName: 'Fridge' },
  { id: 'rating', title: 'Rate your day', svgComponentName: 'Stars' },
  {
    id: 'number',
    title: 'Pick a random number',
    svgComponentName: 'NumberLine',
  },
  { id: 'colour', title: 'Tap the best colour', svgComponentName: 'Swatches' },
  { id: 'door', title: 'Pick a door', svgComponentName: 'Doors' },
  { id: 'cake', title: 'Make the first cut', svgComponentName: 'Cake' },
  { id: 'wish', title: 'Wish on a star', svgComponentName: 'NightSky' },
  {
    id: 'checkout',
    title: 'Pick a checkout lane',
    svgComponentName: 'Checkout',
  },
  { id: 'cat', title: 'Where does the cat sleep?', svgComponentName: 'Bed' },
  { id: 'coffee', title: 'Put down your coffee', svgComponentName: 'Desk' },
  { id: 'step', title: 'Sit on a step', svgComponentName: 'Stairs' },
  {
    id: 'tictactoe',
    title: 'Make the first move',
    svgComponentName: 'TicTacToe',
  },
  { id: 'lane', title: 'Pick your lane', svgComponentName: 'Pool' },
  {
    id: 'locker',
    title: 'Which locker is yours?',
    svgComponentName: 'Lockers',
  },
  { id: 'hide', title: 'Hide from the seeker', svgComponentName: 'FloorPlan' },
  { id: 'gift', title: 'Pick a present', svgComponentName: 'Gifts' },
  { id: 'bite', title: 'Take the first bite', svgComponentName: 'IceCream' },
  { id: 'flag', title: 'Plant the flag', svgComponentName: 'Mountain' },
  { id: 'note', title: 'Play one note', svgComponentName: 'Piano' },
  { id: 'dayoff', title: 'Pick your day off', svgComponentName: 'Week' },
  {
    id: 'emoji-worst',
    title: 'Tap the worst emoji',
    svgComponentName: 'EmojiGrid',
    spicy: true,
  },
  {
    id: 'seat-worst',
    title: 'Pick the worst seat',
    svgComponentName: 'Cinema',
    spicy: true,
  },
  {
    id: 'colour-worst',
    title: 'Tap the ugliest colour',
    svgComponentName: 'Swatches',
    spicy: true,
  },
  {
    id: 'app-delete',
    title: 'Delete one app forever',
    svgComponentName: 'HomeScreen',
    spicy: true,
  },
  {
    id: 'lift-worst',
    title: 'Press the button you shouldn’t',
    svgComponentName: 'Lift',
    spicy: true,
  },
];

export const promptById = (id: string): Prompt | undefined =>
  PROMPTS.find((p) => p.id === id);
