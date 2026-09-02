import { useState } from "react";

const FALLBACK_COLORS = [
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-purple-500 to-purple-700",
  "from-amber-500 to-amber-700",
];

function initials(name?: string | null) {
  return (name || "FE")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MemberAvatar({
  src,
  name,
  className = "w-12 h-12 rounded-xl",
  colorIndex = 0,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  colorIndex?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  if (showImage) {
    return (
      <img
        src={src || ""}
        alt={name || ""}
        className={`${className} object-cover flex-shrink-0 shadow-md`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={`${className} bg-gradient-to-br ${FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length]} flex items-center justify-center flex-shrink-0 shadow-md`}>
      <span className="text-sm font-bold text-white">{initials(name)}</span>
    </div>
  );
}
