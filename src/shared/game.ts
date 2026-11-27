// Game rules and constants shared by server (authoritative) and client (display only).

export const GAME_NAME = 'Care Package';

export const POST_TEASERS: readonly string[] = [
  'Who do you trust?',
  'Something is coming',
  'Check your doorstep',
  'The radio is lying',
  'Lock the hatch',
];

export const postTitleForDay = (day: number): string => {
  const idx = (Math.max(1, day) - 1) % POST_TEASERS.length;
  return POST_TEASERS[idx] ?? 'Who do you trust?';
};

export const START_FOOD = 6;
export const START_POWER = 6;
export const START_HEALTH = 10;
export const START_SCRAP = 2;
export const STAT_MIN = 0;
export const STAT_MAX = 10;

export const MAX_CRATES_PER_DAY = 3;
export const TROJAN_SCRAP_COST = 2;
export const REAL_CRATE_COST = 2;
export const REAL_CRATE_BONUS = 1;
export const CURE_HEALTH = 5;
export const WARDEN_MIN_ACTIONS = 3;
export const TRUST_LB_MIN_EVENTS = 3;

export type DisasterId =
  | 'blackout'
  | 'zombie'
  | 'nuclear'
  | 'civil_war'
  | 'ai_uprising';

export const DISASTER_IDS: readonly DisasterId[] = [
  'blackout',
  'zombie',
  'nuclear',
  'civil_war',
  'ai_uprising',
];

export type DisasterMeta = {
  id: DisasterId;
  name: string;
  accent: string;
  shortIntro: string;
  summary: string;
  hints: readonly [string, string, string];
};

export const DISASTERS: Record<DisasterId, DisasterMeta> = {
  blackout: {
    id: 'blackout',
    name: 'Blackout',
    accent: '#ffd23f',
    shortIntro: 'The grid dies before dawn.',
    summary: '-3 Power across every bunker.',
    hints: [
      'The grid hums wrong tonight…',
      'Substation lights are flickering across the city.',
      'Hold onto your batteries before dark.',
    ],
  },
  zombie: {
    id: 'zombie',
    name: 'Zombie Outbreak',
    accent: '#4ade80',
    shortIntro: 'Something is scratching at the hatch.',
    summary: '-3 Health unless Power >= 3 keeps the fences hot.',
    hints: [
      'Footsteps are dragging past the outer fence…',
      'Keep the floodlights humming or lock the doors.',
      'They only push through when the wire goes cold.',
    ],
  },
  nuclear: {
    id: 'nuclear',
    name: 'Nuclear Winter',
    accent: '#60a5fa',
    shortIntro: 'Ash falls thick and silent.',
    summary: '-3 Food and -1 Power to wait out the freeze.',
    hints: [
      'Gray snow is drifting across the vents…',
      'The temperature just fell twenty degrees.',
      'Rations will matter more than wire tonight.',
    ],
  },
  civil_war: {
    id: 'civil_war',
    name: 'Civil War',
    accent: '#fb7185',
    shortIntro: 'Rival scavengers roam the blocks.',
    summary: '-2 Food; Trojans opened today steal double.',
    hints: [
      'Sirens and flares on the east ridge…',
      'Neighbors are raiding supply drops tonight.',
      'Trust nobody leaving boxes on your porch.',
    ],
  },
  ai_uprising: {
    id: 'ai_uprising',
    name: 'AI Uprising',
    accent: '#c084fc',
    shortIntro: 'Automated drones jam every frequency.',
    summary: 'Scans jam 50% of the time today; -2 Power.',
    hints: [
      'Static is looping our own callsigns back at us…',
      'Scanner dishes are spinning on their own.',
      'Expect interference and heavy drain tonight.',
    ],
  },
};

export const isDisasterId = (v: unknown): v is DisasterId =>
  v === 'blackout' ||
  v === 'zombie' ||
  v === 'nuclear' ||
  v === 'civil_war' ||
  v === 'ai_uprising';

export type LawId =
  | 'free_scans'
  | 'double_trojan_cost'
  | 'friends_only'
  | 'scavenge_plus_one'
  | 'hide_low_trust'
  | 'real_crate_heals';

export const LAW_IDS: readonly LawId[] = [
  'free_scans',
  'double_trojan_cost',
  'friends_only',
  'scavenge_plus_one',
  'hide_low_trust',
  'real_crate_heals',
];

export type LawMeta = {
  id: LawId;
  title: string;
  description: string;
};

export const LAWS: Record<LawId, LawMeta> = {
  free_scans: {
    id: 'free_scans',
    title: 'Open Scanners',
    description: 'Scans are free today.',
  },
  double_trojan_cost: {
    id: 'double_trojan_cost',
    title: 'Scrap Tax',
    description: 'Trojans cost double Scrap today.',
  },
  friends_only: {
    id: 'friends_only',
    title: 'Closed Borders',
    description: 'Random deliveries suspended (friends only).',
  },
  scavenge_plus_one: {
    id: 'scavenge_plus_one',
    title: 'Supply Surge',
    description: 'Scavenging yields +1 extra supply.',
  },
  hide_low_trust: {
    id: 'hide_low_trust',
    title: 'Signal Filter',
    description: 'Broadcasts under 50% Trust are hidden.',
  },
  real_crate_heals: {
    id: 'real_crate_heals',
    title: 'Field Aid',
    description: 'Opening a real crate also heals +1 Health.',
  },
};

export const isLawId = (v: unknown): v is LawId =>
  v === 'free_scans' ||
  v === 'double_trojan_cost' ||
  v === 'friends_only' ||
  v === 'scavenge_plus_one' ||
  v === 'hide_low_trust' ||
  v === 'real_crate_heals';

export type ScavengeSiteId = 'pharmacy' | 'mall' | 'military';

export const SCAVENGE_SITE_IDS: readonly ScavengeSiteId[] = [
  'pharmacy',
  'mall',
  'military',
];

export type ScavengeSiteMeta = {
  id: ScavengeSiteId;
  name: string;
  tagline: string;
  riskLabel: string;
};

export const SCAVENGE_SITES: Record<ScavengeSiteId, ScavengeSiteMeta> = {
  pharmacy: {
    id: 'pharmacy',
    name: 'Pharmacy',
    tagline: '+3 Food or +3 Power, +1 Health',
    riskLabel: 'Safe',
  },
  mall: {
    id: 'mall',
    name: 'Dead Mall',
    tagline: '+4 Food/Power, +1 Scrap',
    riskLabel: '20% chance -2 Health',
  },
  military: {
    id: 'military',
    name: 'Military Base',
    tagline: '+6 Food/Power, +2 Scrap',
    riskLabel: '45% chance -4 Health',
  },
};

export const isScavengeSiteId = (v: unknown): v is ScavengeSiteId =>
  v === 'pharmacy' || v === 'mall' || v === 'military';

export type CrateKind = 'real' | 'trojan';
export type CrateResource = 'food' | 'power';
export type CrateState = 'waiting' | 'opened' | 'burned';
export type CrateScanStatus = 'unscanned' | 'real' | 'trojan' | 'jammed';
export type CrateTargetMode = 'random' | 'friend';

export const isCrateKind = (v: unknown): v is CrateKind =>
  v === 'real' || v === 'trojan';

export const isCrateResource = (v: unknown): v is CrateResource =>
  v === 'food' || v === 'power';

export const isCrateState = (v: unknown): v is CrateState =>
  v === 'waiting' || v === 'opened' || v === 'burned';

export const trojanCostFor = (
  infected: boolean,
  law: LawId | undefined
): number => {
  if (infected) return 0;
  return law === 'double_trojan_cost'
    ? TROJAN_SCRAP_COST * 2
    : TROJAN_SCRAP_COST;
};

export const scanCostFor = (law: LawId | undefined): number =>
  law === 'free_scans' ? 0 : 1;

export const isRandomDeliveryAllowed = (law: LawId | undefined): boolean =>
  law !== 'friends_only';

export type CrateOpenInput = {
  kind: CrateKind;
  resource: CrateResource;
  recipient: {
    food: number;
    power: number;
    health: number;
    infected: boolean;
  };
  disaster: DisasterId;
  law: LawId | undefined;
};

export type CrateOpenResolution = {
  nextFood: number;
  nextPower: number;
  nextHealth: number;
  nextInfected: boolean;
  foodDelta: number;
  powerDelta: number;
  healthDelta: number;
  stolenStat: CrateResource | null;
  stolenAmount: number;
  senderGain: number;
  senderTrustGoodDelta: number;
  senderTrustTotalDelta: number;
  senderCuresDelta: number;
  cured: boolean;
  becameInfected: boolean;
  lawHealed: boolean;
  civilWarDouble: boolean;
};

/** Pure server-side resolution for opening a waiting care package. */
export const resolveCrateOpen = (
  input: CrateOpenInput
): CrateOpenResolution => {
  const { kind, resource, recipient, disaster, law } = input;

  if (kind === 'real') {
    if (recipient.infected) {
      const nextFood =
        resource === 'food'
          ? clampStat(recipient.food + REAL_CRATE_COST)
          : recipient.food;
      const nextPower =
        resource === 'power'
          ? clampStat(recipient.power + REAL_CRATE_COST)
          : recipient.power;
      const nextHealth = clampStat(Math.max(recipient.health, CURE_HEALTH));
      return {
        nextFood,
        nextPower,
        nextHealth,
        nextInfected: false,
        foodDelta: nextFood - recipient.food,
        powerDelta: nextPower - recipient.power,
        healthDelta: nextHealth - recipient.health,
        stolenStat: null,
        stolenAmount: 0,
        senderGain: 0,
        senderTrustGoodDelta: 3,
        senderTrustTotalDelta: 3,
        senderCuresDelta: 1,
        cured: true,
        becameInfected: false,
        lawHealed: false,
        civilWarDouble: false,
      };
    }

    const totalGain = REAL_CRATE_COST + REAL_CRATE_BONUS;
    const nextFood =
      resource === 'food'
        ? clampStat(recipient.food + totalGain)
        : recipient.food;
    const nextPower =
      resource === 'power'
        ? clampStat(recipient.power + totalGain)
        : recipient.power;
    const lawHealed = law === 'real_crate_heals';
    const nextHealth = lawHealed
      ? clampStat(recipient.health + 1)
      : recipient.health;
    return {
      nextFood,
      nextPower,
      nextHealth,
      nextInfected: false,
      foodDelta: nextFood - recipient.food,
      powerDelta: nextPower - recipient.power,
      healthDelta: nextHealth - recipient.health,
      stolenStat: null,
      stolenAmount: 0,
      senderGain: 0,
      senderTrustGoodDelta: 1,
      senderTrustTotalDelta: 1,
      senderCuresDelta: 0,
      cured: false,
      becameInfected: false,
      lawHealed,
      civilWarDouble: false,
    };
  }

  const civilWarDouble = disaster === 'civil_war';
  const stealCap = civilWarDouble ? 6 : 3;
  const stolenStat: CrateResource =
    recipient.food >= recipient.power ? 'food' : 'power';
  const available = stolenStat === 'food' ? recipient.food : recipient.power;
  const stolenAmount = Math.min(available, stealCap);
  const senderGain = Math.floor(stolenAmount / 2);

  const nextFood =
    stolenStat === 'food'
      ? clampStat(recipient.food - stolenAmount)
      : recipient.food;
  const nextPower =
    stolenStat === 'power'
      ? clampStat(recipient.power - stolenAmount)
      : recipient.power;
  const nextHealth = clampStat(recipient.health - 2);
  const becameInfected = nextHealth === 0 && !recipient.infected;
  const nextInfected = recipient.infected || nextHealth === 0;

  return {
    nextFood,
    nextPower,
    nextHealth,
    nextInfected,
    foodDelta: nextFood - recipient.food,
    powerDelta: nextPower - recipient.power,
    healthDelta: nextHealth - recipient.health,
    stolenStat,
    stolenAmount,
    senderGain,
    senderTrustGoodDelta: 0,
    senderTrustTotalDelta: 1,
    senderCuresDelta: 0,
    cured: false,
    becameInfected,
    lawHealed: false,
    civilWarDouble,
  };
};

export type ClaimId =
  | 'tonight_blackout'
  | 'tonight_zombie'
  | 'tonight_nuclear'
  | 'tonight_civil_war'
  | 'tonight_ai_uprising'
  | 'not_blackout'
  | 'not_zombie'
  | 'not_nuclear'
  | 'not_civil_war'
  | 'not_ai_uprising'
  | 'stock_food'
  | 'stock_power'
  | 'barricade_health';

export const CLAIM_IDS: readonly ClaimId[] = [
  'tonight_blackout',
  'tonight_zombie',
  'tonight_nuclear',
  'tonight_civil_war',
  'tonight_ai_uprising',
  'not_blackout',
  'not_zombie',
  'not_nuclear',
  'not_civil_war',
  'not_ai_uprising',
  'stock_food',
  'stock_power',
  'barricade_health',
];

export type ClaimMeta = {
  id: ClaimId;
  text: string;
};

export const CLAIMS: Record<ClaimId, ClaimMeta> = {
  tonight_blackout: { id: 'tonight_blackout', text: 'Tonight is Blackout' },
  tonight_zombie: { id: 'tonight_zombie', text: 'Tonight is Zombie Outbreak' },
  tonight_nuclear: { id: 'tonight_nuclear', text: 'Tonight is Nuclear Winter' },
  tonight_civil_war: { id: 'tonight_civil_war', text: 'Tonight is Civil War' },
  tonight_ai_uprising: {
    id: 'tonight_ai_uprising',
    text: 'Tonight is AI Uprising',
  },
  not_blackout: { id: 'not_blackout', text: 'Tonight is NOT Blackout' },
  not_zombie: { id: 'not_zombie', text: 'Tonight is NOT Zombie Outbreak' },
  not_nuclear: { id: 'not_nuclear', text: 'Tonight is NOT Nuclear Winter' },
  not_civil_war: { id: 'not_civil_war', text: 'Tonight is NOT Civil War' },
  not_ai_uprising: {
    id: 'not_ai_uprising',
    text: 'Tonight is NOT AI Uprising',
  },
  stock_food: { id: 'stock_food', text: 'Stock up on Food' },
  stock_power: { id: 'stock_power', text: 'Stock up on Power' },
  barricade_health: {
    id: 'barricade_health',
    text: 'Barricade up: Health hits tonight',
  },
};

export const isClaimId = (v: unknown): v is ClaimId =>
  v === 'tonight_blackout' ||
  v === 'tonight_zombie' ||
  v === 'tonight_nuclear' ||
  v === 'tonight_civil_war' ||
  v === 'tonight_ai_uprising' ||
  v === 'not_blackout' ||
  v === 'not_zombie' ||
  v === 'not_nuclear' ||
  v === 'not_civil_war' ||
  v === 'not_ai_uprising' ||
  v === 'stock_food' ||
  v === 'stock_power' ||
  v === 'barricade_health';

export const isClaimTrue = (claim: ClaimId, disaster: DisasterId): boolean => {
  switch (claim) {
    case 'tonight_blackout':
      return disaster === 'blackout';
    case 'tonight_zombie':
      return disaster === 'zombie';
    case 'tonight_nuclear':
      return disaster === 'nuclear';
    case 'tonight_civil_war':
      return disaster === 'civil_war';
    case 'tonight_ai_uprising':
      return disaster === 'ai_uprising';
    case 'not_blackout':
      return disaster !== 'blackout';
    case 'not_zombie':
      return disaster !== 'zombie';
    case 'not_nuclear':
      return disaster !== 'nuclear';
    case 'not_civil_war':
      return disaster !== 'civil_war';
    case 'not_ai_uprising':
      return disaster !== 'ai_uprising';
    case 'stock_food':
      return disaster === 'nuclear' || disaster === 'civil_war';
    case 'stock_power':
      return (
        disaster === 'blackout' ||
        disaster === 'ai_uprising' ||
        disaster === 'zombie'
      );
    case 'barricade_health':
      return disaster === 'zombie';
  }
};

/** Laplace-smoothed public trust percentage (starts at 50%). */
export const trustPercent = (good: number, total: number): number =>
  Math.round(((good + 1) / (total + 2)) * 100);

/** Clamps Food, Power, or Health into [0, 10]. */
export const clampStat = (value: number): number =>
  Math.min(STAT_MAX, Math.max(STAT_MIN, Math.trunc(value)));

export type ScavengeOutcome = {
  site: ScavengeSiteId;
  foodDelta: number;
  powerDelta: number;
  scrapDelta: number;
  healthDelta: number;
  loot: string[];
  note: string;
  becameInfected: boolean;
  lawBonus: boolean;
};

export type RolledScavenge = Omit<ScavengeOutcome, 'becameInfected'>;

const FOOD_LOOT: readonly string[] = [
  'half a granola bar',
  'expired energy drink',
  'lukewarm canned beans',
  'crushed ramen brick',
  'mystery jerky',
  '1998 MRE',
];

const POWER_LOOT: readonly string[] = [
  'phone at 3%',
  'one (1) AirPod',
  'duct-taped battery',
  'cracked solar bank',
  'loose copper wire',
  'half-charged power tool',
];

const SCRAP_LOOT: readonly string[] = [
  'bent crowbar',
  'rusted padlock',
  'salvaged circuit board',
  'box of bolts',
];

const SAFE_NOTES: Record<ScavengeSiteId, string> = {
  pharmacy: 'Quiet shelves. You grabbed what still had a label.',
  mall: 'The escalator groaned, but nobody spotted you.',
  military: 'Siren stayed silent. Best haul all week.',
};

const HURT_NOTES: Record<ScavengeSiteId, string> = {
  pharmacy: 'Safe haul.',
  mall: 'A tripwire snapped near the food court. You limped out.',
  military: 'Motion turret grazed your shoulder before you bolted.',
};

const pickItem = (list: readonly string[], rng: () => number): string => {
  const idx = Math.floor(rng() * list.length);
  return list[idx] ?? list[0] ?? 'mystery ration';
};

/**
 * Pure server-side roll for a scavenge run. Shared so unit tests can run directly.
 */
export const rollScavenge = (
  site: ScavengeSiteId,
  law: LawId | undefined,
  rng: () => number = Math.random
): RolledScavenge => {
  let foodDelta = 0;
  let powerDelta = 0;
  let scrapDelta = 0;
  let healthDelta = 0;

  if (site === 'pharmacy') {
    if (rng() < 0.5) foodDelta = 3;
    else powerDelta = 3;
    healthDelta = 1;
  } else if (site === 'mall') {
    foodDelta = Math.floor(rng() * 5);
    powerDelta = 4 - foodDelta;
    scrapDelta = 1;
    if (rng() < 0.2) healthDelta = -2;
  } else {
    foodDelta = Math.floor(rng() * 7);
    powerDelta = 6 - foodDelta;
    scrapDelta = 2;
    if (rng() < 0.45) healthDelta = -4;
  }

  let lawBonus = false;
  if (law === 'scavenge_plus_one') {
    lawBonus = true;
    if (foodDelta >= powerDelta) foodDelta += 1;
    else powerDelta += 1;
  }

  const loot: string[] = [];
  if (foodDelta > 0) loot.push(pickItem(FOOD_LOOT, rng));
  if (powerDelta > 0) loot.push(pickItem(POWER_LOOT, rng));
  if (scrapDelta > 0) loot.push(pickItem(SCRAP_LOOT, rng));

  const note = healthDelta < 0 ? HURT_NOTES[site] : SAFE_NOTES[site];

  return {
    site,
    foodDelta,
    powerDelta,
    scrapDelta,
    healthDelta,
    loot,
    note,
    lawBonus,
  };
};

/** Milliseconds timestamp of the next 00:00 UTC. */
export const nextResetAt = (now: number): number => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
};

export const FLAIR_PREFIXES: readonly string[] = [
  'Survivor ·',
  'Infected 🧟 ·',
  'Warden ·',
];

/**
 * Protects community flair: only sets Care Package flair if the user has no
 * flair text or already wears a Care Package flair prefix.
 */
export const canOverwriteFlair = (
  existingFlairText: string | undefined
): boolean => {
  if (!existingFlairText) return true;
  const trimmed = existingFlairText.trim();
  if (trimmed === '') return true;
  return FLAIR_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
};

export type NpcProfile = {
  id: string;
  name: string;
  trust: number;
  role: 'helper' | 'trickster';
};

export const NPCS: readonly NpcProfile[] = [
  {
    id: 'npc_radio_guy',
    name: '[NPC] Old Radio Guy',
    trust: 78,
    role: 'helper',
  },
  {
    id: 'npc_med_drone',
    name: '[NPC] Med-Bay Drone',
    trust: 85,
    role: 'helper',
  },
  {
    id: 'npc_scrap_kid',
    name: '[NPC] Scrap Kid',
    trust: 61,
    role: 'helper',
  },
  {
    id: 'npc_mall_rat',
    name: '[NPC] Mall Rat',
    trust: 38,
    role: 'trickster',
  },
  {
    id: 'npc_alley_trader',
    name: '[NPC] Alley Trader',
    trust: 42,
    role: 'trickster',
  },
];

export const isNpcId = (id: string): boolean => id.startsWith('npc_');

export const npcById = (id: string): NpcProfile | undefined =>
  NPCS.find((n) => n.id === id);

/** Picks 1 deterministic true-but-vague hint for today's disaster. */
export const officialSignalForDay = (
  day: number,
  disaster: DisasterId
): string => {
  const hints = DISASTERS[disaster].hints;
  const idx = (Math.max(1, day) - 1) % hints.length;
  return hints[idx] ?? hints[0];
};

export type NpcCrateSpec = {
  npc: NpcProfile;
  kind: CrateKind;
  resource: CrateResource;
};

/** Day-1 starter doorstep: 1 real crate from a helper NPC + 1 Trojan from a trickster NPC. */
export const pickDayOneNpcCrateSpecs = (
  rng: () => number = Math.random
): readonly [NpcCrateSpec, NpcCrateSpec] => {
  const helpers = NPCS.filter((n) => n.role === 'helper');
  const tricksters = NPCS.filter((n) => n.role === 'trickster');
  const helper =
    helpers[Math.floor(rng() * helpers.length)] ?? NPCS[0]!;
  const trickster =
    tricksters[Math.floor(rng() * tricksters.length)] ?? NPCS[3]!;
  const realResource: CrateResource = rng() < 0.5 ? 'food' : 'power';
  return [
    { npc: helper, kind: 'real', resource: realResource },
    { npc: trickster, kind: 'trojan', resource: 'food' },
  ];
};

export type NpcBroadcastSpec = {
  npcId: string;
  claimId: ClaimId;
};

/** Generates 1-2 mostly-true daily NPC broadcasts so the Radio is never empty. */
export const pickNpcBroadcastSpecs = (
  day: number,
  disaster: DisasterId,
  rng: () => number = Math.random
): readonly NpcBroadcastSpec[] => {
  const trueClaims = CLAIM_IDS.filter((id) => isClaimTrue(id, disaster));
  const falseClaims = CLAIM_IDS.filter((id) => !isClaimTrue(id, disaster));
  const count = day === 1 ? 2 : rng() < 0.3 ? 1 : 2;

  const helpers = NPCS.filter((n) => n.role === 'helper');
  const firstNpc = helpers[Math.floor(rng() * helpers.length)] ?? NPCS[0]!;
  const firstClaim =
    trueClaims[Math.floor(rng() * trueClaims.length)] ?? 'stock_power';

  if (count === 1) {
    return [{ npcId: firstNpc.id, claimId: firstClaim }];
  }

  const others = NPCS.filter((n) => n.id !== firstNpc.id);
  const secondNpc = others[Math.floor(rng() * others.length)] ?? NPCS[3]!;
  const tellTruth = rng() < 0.7;
  const pool = tellTruth ? trueClaims : falseClaims;
  const filtered = pool.filter((c) => c !== firstClaim);
  const pickPool = filtered.length > 0 ? filtered : pool;
  const secondClaim =
    pickPool[Math.floor(rng() * pickPool.length)] ?? firstClaim;

  return [
    { npcId: firstNpc.id, claimId: firstClaim },
    { npcId: secondNpc.id, claimId: secondClaim },
  ];
};

/** Deterministic PRNG seeded from an arbitrary string (FNV-1a + Mulberry32). */
export const seedFromString = (input: string): (() => number) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type PlayerBroadcastCandidate = {
  userId: string;
  username: string;
  trust: number;
  infected: boolean;
  claimId: ClaimId;
};

const seededShuffle = <T>(
  items: readonly T[],
  rng: () => number
): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = arr[i];
    const b = arr[j];
    if (a !== undefined && b !== undefined) {
      arr[i] = b;
      arr[j] = a;
    }
  }
  return arr;
};

/**
 * Selects up to `limit` (4) player broadcasts deterministically per (day, viewerId):
 * - If Warden law `hide_low_trust` is active, hides all <50% Trust (including Infected).
 * - Otherwise Infected broadcasts always show, prefers high-Trust broadcasters,
 *   and ensures at least 1 <50% Trust broadcaster when available.
 */
export const samplePlayerBroadcasts = (params: {
  day: number;
  viewerId: string;
  law: LawId | undefined;
  candidates: readonly PlayerBroadcastCandidate[];
  limit?: number;
}): PlayerBroadcastCandidate[] => {
  const limit = params.limit ?? 4;
  if (limit <= 0 || params.candidates.length === 0) return [];

  const hideLowTrust = params.law === 'hide_low_trust';
  const eligible = hideLowTrust
    ? params.candidates.filter((c) => c.trust >= 50)
    : [...params.candidates];

  if (eligible.length === 0) return [];

  const rng = seedFromString(`radio:${params.day}:${params.viewerId}`);
  const ordered = seededShuffle(eligible, rng);
  const infected = ordered.filter((c) => c.infected);
  const regular = ordered.filter((c) => !c.infected);

  const picked: PlayerBroadcastCandidate[] = [];
  for (const item of infected) {
    if (picked.length >= limit) break;
    picked.push(item);
  }

  if (picked.length < limit) {
    const lowTrust = regular.filter((c) => c.trust < 50);
    const highTrust = regular
      .filter((c) => c.trust >= 50)
      .map((c, idx) => ({ item: c, tie: rng(), idx }))
      .sort((a, b) =>
        b.item.trust !== a.item.trust
          ? b.item.trust - a.item.trust
          : a.tie - b.tie || a.idx - b.idx
      )
      .map((entry) => entry.item);

    const usedIds = new Set(picked.map((p) => p.userId));
    if (
      !hideLowTrust &&
      !picked.some((p) => p.trust < 50) &&
      lowTrust.length > 0
    ) {
      const lowPick = lowTrust[0];
      if (lowPick) {
        picked.push(lowPick);
        usedIds.add(lowPick.userId);
      }
    }

    for (const high of highTrust) {
      if (picked.length >= limit) break;
      if (!usedIds.has(high.userId)) {
        picked.push(high);
        usedIds.add(high.userId);
      }
    }

    for (const low of lowTrust) {
      if (picked.length >= limit) break;
      if (!usedIds.has(low.userId)) {
        picked.push(low);
        usedIds.add(low.userId);
      }
    }
  }

  return seededShuffle(picked, rng);
};
