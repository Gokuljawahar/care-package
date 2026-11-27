import { navigateTo, showToast } from '@devvit/web/client';
import type { ResultResponse } from '../../shared/api';
import type { Prompt } from '../../shared/prompts';
import { Mini } from '../components/Mini';
import { useCountUp } from '../hooks/useCountUp';
import { useCountdown } from '../hooks/useCountdown';

const square = (score: number) =>
  score >= 80 ? '🟪' : score >= 50 ? '🟨' : score >= 20 ? '🟦' : '⬛';

const shareText = (r: ResultResponse) =>
  `Thumbprint #${r.day} · ${r.npc}% NPC (${r.label})\n${r.reveals.map((v) => square(v.score)).join('')}`;

type Props = { result: ResultResponse; prompts: Prompt[] };

export const Result = ({ result, prompts }: Props) => {
  const countdown = useCountdown(result.nextResetAt);
  const shown = useCountUp(result.npc);

  const toComments = async () => {
    try {
      await navigator.clipboard.writeText(shareText(result));
      showToast('Result copied. Paste it in the comments');
    } catch {
      // Clipboard can be blocked in some webviews; still open the comments.
    }
    if (result.postUrl) navigateTo(result.postUrl);
  };

  return (
    <div className="flex h-full flex-col items-center px-5 pt-4 pb-3 text-center">
      <div className="flex w-full items-center justify-between text-xs font-semibold text-muted">
        <span>Thumbprint #{result.day}</span>
        <span>Next in {countdown}</span>
      </div>

      <div className="mt-2 flex flex-col items-center">
        <p
          className="npc-number font-display leading-none font-bold"
          aria-label={`${result.npc}% NPC`}
        >
          {shown}%
        </p>
        <p className="mt-1 text-xs tracking-widest text-muted uppercase">
          NPC score
        </p>
        <p className="label-pill mt-2">{result.label}</p>
      </div>

      <div className="mt-4 grid w-full max-w-[360px] grid-cols-5 gap-2">
        {prompts.map((p) => (
          <Mini
            key={p.id}
            prompt={p}
            reveal={result.reveals.find((r) => r.promptId === p.id)}
          />
        ))}
      </div>

      <div className="mt-3 flex gap-4 text-sm font-semibold">
        <span>🔥 {result.streak}-day streak</span>
        <span className="text-muted">
          Top {result.topPercent}% of {result.players}
        </span>
      </div>

      <div className="mt-auto flex w-full max-w-[340px] flex-col items-center gap-2">
        <button
          className="btn btn-primary w-full"
          onClick={() => void toComments()}
        >
          Flex it in the comments
        </button>
        <button
          className="min-h-[44px] px-4 text-sm font-semibold text-muted underline-offset-4 hover:underline"
          onClick={() =>
            navigateTo(`https://www.reddit.com/r/${result.subredditName}/`)
          }
        >
          Join r/{result.subredditName}
        </button>
      </div>
    </div>
  );
};
