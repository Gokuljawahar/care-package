import { GRID } from '../../shared/game';
import type { PromptReveal } from '../../shared/api';
import type { Prompt } from '../../shared/prompts';
import { Picture } from '../pictures';
import { Heatmap } from './Heatmap';

/** Small heatmap thumbnail for the result card. */
export const Mini = ({ prompt, reveal }: { prompt: Prompt; reveal: PromptReveal | undefined }) => (
  <div className="mini relative aspect-square overflow-hidden rounded-xl" title={prompt.title}>
    <div className="picture absolute inset-0 opacity-50">
      <Picture name={prompt.svgComponentName} />
    </div>
    {reveal && (
      <>
        <Heatmap cells={reveal.grid} />
        <span
          className="mini-dot absolute"
          style={{
            left: `${((reveal.cx + 0.5) / GRID) * 100}%`,
            top: `${((reveal.cy + 0.5) / GRID) * 100}%`,
          }}
        />
      </>
    )}
  </div>
);
