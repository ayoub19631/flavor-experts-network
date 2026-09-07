import { Link } from "react-router-dom";
import { renderMentionSegments } from "@/lib/phase5/mentions";

type Props = {
  text: string;
  className?: string;
};

export default function MentionRichText({ text, className }: Props) {
  return (
    <div className={className}>
      {renderMentionSegments(text).map((segment, index) =>
        segment.type === "mention" ? (
          <Link
            key={`mention-${segment.profileId}-${index}`}
            to={`/members/${segment.profileId}`}
            className="font-medium text-primary hover:underline"
          >
            @{segment.value}
          </Link>
        ) : (
          <span key={`text-${index}`}>{segment.value}</span>
        ),
      )}
    </div>
  );
}
