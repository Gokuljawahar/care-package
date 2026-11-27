import type { RadioBroadcast } from '../../shared/api';

type Props = {
  day: number;
  feed: RadioBroadcast[];
  onBack: () => void;
};

export const Radio = ({ day, feed, onBack }: Props) => (
  <div className="flex h-full flex-col justify-between gap-2 px-4 pt-2.5 pb-3">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="font-display text-xl font-bold">Radio</h2>
      </div>
      <span className="chip">Day {day} · {feed.length} signals</span>
    </div>

    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      {feed.map((item) => (
        <div
          key={item.id}
          className={`panel px-3 py-2.5 ${item.isOfficial ? 'real-panel' : ''}`}
        >
          <div className="flex items-center justify-between gap-2 text-xs font-bold">
            <span className="truncate">
              {item.isOfficial || item.isNpc
                ? item.senderName
                : `u/${item.senderName}`}
            </span>
            {item.isOfficial ? (
              <span className="pill text-toxic">Verified</span>
            ) : (
              <span className="pill">
                {item.isNpc ? 'NPC · ' : ''}
                {item.senderTrust ?? 50}% Trust
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold">{item.text}</p>
        </div>
      ))}
    </div>

    <p className="text-center text-[11px] text-muted">
      Player broadcasts unlock in Milestone 4.
    </p>
  </div>
);
