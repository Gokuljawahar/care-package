export const keys = {
  currentDay: () => 'day:current',
  dayPrompts: (n: number) => `day:${n}:prompts`,
  dayPost: (n: number) => `day:${n}:postId`,
  dayClosed: (n: number) => `day:${n}:closed`,
  grid: (n: number, promptId: string) => `day:${n}:p:${promptId}:grid`,
  taps: (n: number, promptId: string) => `day:${n}:p:${promptId}:taps`,
  npc: (n: number) => `day:${n}:npc`,
  user: (id: string) => `user:${id}`,
  streaks: () => 'lb:streaks',
  usernames: () => 'usernames',
  usedPrompts: () => 'prompts:used',
  resetLock: () => 'lock:reset',
};
