import { looksTechnicalPost, shouldCollapsePost, splitPostPresentation, truncatePost, uniqueHashtags } from "@/lib/community-post";

type Props = {
  text: string;
  expanded: boolean;
  onToggle: () => void;
  onHashtag: (tag: string) => void;
  seeMore: string;
  seeLess: string;
  technicalLabel: string;
};

function renderRichText(text: string, onHashtag: (tag: string) => void) {
  return text.split(/(#[\p{L}\p{N}_-]+)/gu).map((part, index) =>
    part.startsWith("#") ? (
      <button
        key={`${part}-${index}`}
        type="button"
        className="font-medium text-primary hover:underline"
        onClick={() => onHashtag(part)}
      >
        {part}
      </button>
    ) : (
      <span key={`${index}-${part.slice(0, 8)}`}>{part}</span>
    ),
  );
}

export default function CommunityPostBody({
  text,
  expanded,
  onToggle,
  onHashtag,
  seeMore,
  seeLess,
  technicalLabel,
}: Props) {
  const { title, body } = splitPostPresentation(text);
  const collapsible = shouldCollapsePost(body);
  const shown = !expanded && collapsible ? truncatePost(body) : body;
  const tags = uniqueHashtags(text);
  const technical = looksTechnicalPost(text);

  return (
    <div className="mt-3 space-y-2">
      {title && (
        <h3 className="text-[16px] sm:text-[17px] font-semibold leading-snug tracking-tight text-foreground">
          {renderRichText(title, onHashtag)}
        </h3>
      )}
      {technical && (
        <p className="text-[11px] font-medium uppercase tracking-wide text-primary/80">{technicalLabel}</p>
      )}
      <div className="relative">
        <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
          {renderRichText(shown, onHashtag)}
          {!expanded && collapsible ? "…" : null}
        </p>
        {!expanded && collapsible && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {collapsible && (
        <button
          type="button"
          onClick={onToggle}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {expanded ? seeLess : seeMore}
        </button>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.slice(0, 6).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onHashtag(tag)}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
