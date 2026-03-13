import { useState } from "react";
import {
  ThumbsUp, MessageCircle, Share2, Heart, Repeat2, Bookmark,
  Globe, MoreHorizontal, ChevronDown, MapPin,
} from "lucide-react";

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "google_business"
  | "tiktok";

interface SocialPostPreviewProps {
  platform: SocialPlatform;
  content: string;
  businessName?: string;
  hashtags?: string;
  imageUrl?: string;
  platforms?: SocialPlatform[]; // for multi-platform tab switching
  onPlatformChange?: (p: SocialPlatform) => void;
}

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; color: string; bgColor: string; accentColor: string }
> = {
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    bgColor: "#f0f2f5",
    accentColor: "#1877F2",
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    bgColor: "#fafafa",
    accentColor: "#E1306C",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    bgColor: "#f3f2ef",
    accentColor: "#0A66C2",
  },
  twitter: {
    label: "X / Twitter",
    color: "#000000",
    bgColor: "#ffffff",
    accentColor: "#1d9bf0",
  },
  google_business: {
    label: "Google Business",
    color: "#4285F4",
    bgColor: "#f8f9fa",
    accentColor: "#4285F4",
  },
  tiktok: {
    label: "TikTok",
    color: "#010101",
    bgColor: "#010101",
    accentColor: "#fe2c55",
  },
};

function truncateContent(text: string, maxLen: number) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

function AvatarPlaceholder({
  name,
  color,
  size = 40,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initial = name?.[0]?.toUpperCase() ?? "B";
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

// ─── Facebook Preview ─────────────────────────────────────────────────────────
function FacebookPreview({
  content,
  businessName,
  hashtags,
  imageUrl,
}: Omit<SocialPostPreviewProps, "platform">) {
  const meta = PLATFORM_META.facebook;
  return (
    <div
      className="rounded-xl overflow-hidden shadow-md font-sans text-sm"
      style={{ background: meta.bgColor, maxWidth: 500 }}
    >
      {/* Post card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-3 pb-2">
          <AvatarPlaceholder name={businessName ?? "B"} color={meta.color} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[13px] text-gray-900 leading-tight">
              {businessName ?? "Your Business"}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
              <span>Just now</span>
              <span>·</span>
              <Globe className="h-3 w-3" />
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-gray-400 shrink-0" />
        </div>
        {/* Content */}
        <div className="px-3 pb-2">
          <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">
            {content
              ? truncateContent(content, 280)
              : <span className="text-gray-400 italic">Your post content will appear here…</span>}
          </p>
          {hashtags && (
            <p className="text-[12px] mt-1" style={{ color: meta.color }}>
              {hashtags}
            </p>
          )}
        </div>
        {/* Image placeholder */}
        {imageUrl ? (
          <img src={imageUrl} alt="Post media" className="w-full object-cover max-h-64" />
        ) : (
          <div
            className="w-full h-40 flex items-center justify-center text-gray-400 text-xs"
            style={{ background: "#e4e6ea" }}
          >
            Image / Media Placeholder
          </div>
        )}
        {/* Reactions bar */}
        <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between text-[12px] text-gray-500">
          <div className="flex items-center gap-1">
            <span className="text-base">👍❤️😮</span>
            <span>42</span>
          </div>
          <div className="flex gap-3">
            <span>8 comments</span>
            <span>3 shares</span>
          </div>
        </div>
        {/* Action buttons */}
        <div className="px-3 py-1 border-t border-gray-100 flex justify-around">
          {[
            { icon: ThumbsUp, label: "Like" },
            { icon: MessageCircle, label: "Comment" },
            { icon: Share2, label: "Share" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-md text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Instagram Preview ────────────────────────────────────────────────────────
function InstagramPreview({
  content,
  businessName,
  hashtags,
  imageUrl,
}: Omit<SocialPostPreviewProps, "platform">) {
  const meta = PLATFORM_META.instagram;
  return (
    <div
      className="rounded-xl overflow-hidden shadow-md font-sans text-sm bg-white"
      style={{ maxWidth: 400 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-100">
        <div
          className="rounded-full p-0.5"
          style={{
            background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
          }}
        >
          <AvatarPlaceholder name={businessName ?? "B"} color="#E1306C" size={32} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[13px] text-gray-900 leading-tight">
            {businessName?.toLowerCase().replace(/\s/g, "_") ?? "your_business"}
          </p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-gray-400" />
      </div>
      {/* Image */}
      {imageUrl ? (
        <img src={imageUrl} alt="Post media" className="w-full object-cover aspect-square" />
      ) : (
        <div
          className="w-full aspect-square flex items-center justify-center text-gray-400 text-xs"
          style={{ background: "#efefef" }}
        >
          Image / Media Placeholder
        </div>
      )}
      {/* Actions */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-3">
        <Heart className="h-6 w-6 text-gray-700" />
        <MessageCircle className="h-6 w-6 text-gray-700" />
        <Share2 className="h-6 w-6 text-gray-700" />
        <div className="flex-1" />
        <Bookmark className="h-6 w-6 text-gray-700" />
      </div>
      <div className="px-3 pb-1 text-[12px] font-semibold text-gray-900">42 likes</div>
      {/* Caption */}
      <div className="px-3 pb-2">
        <p className="text-[13px] text-gray-800 leading-relaxed">
          <span className="font-semibold mr-1">
            {businessName?.toLowerCase().replace(/\s/g, "_") ?? "your_business"}
          </span>
          {content
            ? truncateContent(content, 200)
            : <span className="text-gray-400 italic">Your caption will appear here…</span>}
        </p>
        {hashtags && (
          <p className="text-[12px] mt-0.5" style={{ color: meta.color }}>
            {hashtags}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── LinkedIn Preview ─────────────────────────────────────────────────────────
function LinkedInPreview({
  content,
  businessName,
  hashtags,
  imageUrl,
}: Omit<SocialPostPreviewProps, "platform">) {
  const meta = PLATFORM_META.linkedin;
  return (
    <div
      className="rounded-xl overflow-hidden shadow-md font-sans text-sm bg-white"
      style={{ maxWidth: 500 }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <AvatarPlaceholder name={businessName ?? "B"} color={meta.color} size={48} />
          <div className="flex-1">
            <p className="font-semibold text-[14px] text-gray-900">
              {businessName ?? "Your Business"}
            </p>
            <p className="text-[12px] text-gray-500">Company · 1st</p>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
              <span>Just now</span>
              <span>·</span>
              <Globe className="h-3 w-3" />
            </div>
          </div>
          <button className="text-[13px] font-semibold" style={{ color: meta.color }}>
            + Follow
          </button>
        </div>
        {/* Content */}
        <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap mb-2">
          {content
            ? truncateContent(content, 300)
            : <span className="text-gray-400 italic">Your post content will appear here…</span>}
        </p>
        {hashtags && (
          <p className="text-[13px] mb-2" style={{ color: meta.color }}>
            {hashtags}
          </p>
        )}
      </div>
      {/* Image */}
      {imageUrl ? (
        <img src={imageUrl} alt="Post media" className="w-full object-cover max-h-64" />
      ) : (
        <div
          className="w-full h-36 flex items-center justify-center text-gray-400 text-xs"
          style={{ background: "#e9e5df" }}
        >
          Image / Media Placeholder
        </div>
      )}
      {/* Reactions */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[12px] text-gray-500">
        <div className="flex items-center gap-1">
          <span className="text-base">👍❤️💡</span>
          <span>87</span>
        </div>
        <span>12 comments</span>
      </div>
      {/* Actions */}
      <div className="px-2 py-1 border-t border-gray-100 flex justify-around">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageCircle, label: "Comment" },
          { icon: Repeat2, label: "Repost" },
          { icon: Share2, label: "Send" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex items-center gap-1 py-1.5 px-2 rounded-md text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Twitter/X Preview ────────────────────────────────────────────────────────
function TwitterPreview({
  content,
  businessName,
  hashtags,
  imageUrl,
}: Omit<SocialPostPreviewProps, "platform">) {
  const fullText = [content, hashtags].filter(Boolean).join("\n\n");
  const charCount = fullText.length;
  return (
    <div
      className="rounded-xl overflow-hidden shadow-md font-sans text-sm bg-white border border-gray-200"
      style={{ maxWidth: 500 }}
    >
      <div className="p-4">
        <div className="flex gap-3">
          <AvatarPlaceholder name={businessName ?? "B"} color="#000" size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[14px] text-gray-900">
                {businessName ?? "Your Business"}
              </span>
              <span className="text-[13px] text-gray-500">
                @{businessName?.toLowerCase().replace(/\s/g, "") ?? "yourbusiness"}
              </span>
              <span className="text-gray-400 text-[12px]">· now</span>
            </div>
            <p className="text-[14px] text-gray-800 leading-relaxed mt-1 whitespace-pre-wrap">
              {content
                ? truncateContent(content, 280)
                : <span className="text-gray-400 italic">Your tweet will appear here…</span>}
            </p>
            {hashtags && (
              <p className="text-[13px] mt-1 text-blue-500">{hashtags}</p>
            )}
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Post media"
                className="w-full object-cover rounded-xl mt-2 max-h-48"
              />
            )}
            {/* Character count */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-4 text-gray-500">
                <MessageCircle className="h-4 w-4" />
                <Repeat2 className="h-4 w-4" />
                <Heart className="h-4 w-4" />
                <Bookmark className="h-4 w-4" />
              </div>
              <span
                className={`text-[11px] font-medium ${
                  charCount > 280 ? "text-red-500" : "text-gray-400"
                }`}
              >
                {charCount}/280
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Google Business Profile Preview ─────────────────────────────────────────
function GoogleBusinessPreview({
  content,
  businessName,
  imageUrl,
}: Omit<SocialPostPreviewProps, "platform">) {
  return (
    <div
      className="rounded-xl overflow-hidden shadow-md font-sans text-sm bg-white border border-gray-200"
      style={{ maxWidth: 400 }}
    >
      {/* Image */}
      {imageUrl ? (
        <img src={imageUrl} alt="Post media" className="w-full object-cover h-48" />
      ) : (
        <div
          className="w-full h-40 flex items-center justify-center text-gray-400 text-xs"
          style={{ background: "#f1f3f4" }}
        >
          Image / Media Placeholder
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <AvatarPlaceholder name={businessName ?? "B"} color="#4285F4" size={32} />
          <div>
            <p className="font-semibold text-[13px] text-gray-900">
              {businessName ?? "Your Business"}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <MapPin className="h-3 w-3" />
              <span>Google Business Profile</span>
            </div>
          </div>
        </div>
        <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">
          {content
            ? truncateContent(content, 300)
            : <span className="text-gray-400 italic">Your Google Business post will appear here…</span>}
        </p>
        <button
          className="mt-3 w-full py-2 rounded-lg text-[13px] font-medium text-white"
          style={{ background: "#4285F4" }}
        >
          Learn more
        </button>
      </div>
    </div>
  );
}

// ─── Main SocialPostPreview ───────────────────────────────────────────────────
export function SocialPostPreview({
  platform,
  content,
  businessName,
  hashtags,
  imageUrl,
  platforms,
  onPlatformChange,
}: SocialPostPreviewProps) {
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>(platform);

  const handlePlatformChange = (p: SocialPlatform) => {
    setActivePlatform(p);
    onPlatformChange?.(p);
  };

  const previewProps = { content, businessName, hashtags, imageUrl };

  return (
    <div className="flex flex-col gap-3">
      {/* Platform tabs (if multiple) */}
      {platforms && platforms.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {platforms.map((p) => {
            const meta = PLATFORM_META[p];
            const isActive = activePlatform === p;
            return (
              <button
                key={p}
                onClick={() => handlePlatformChange(p)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={
                  isActive
                    ? {
                        background: meta.color,
                        color: "#fff",
                        boxShadow: `0 0 0 2px ${meta.color}40`,
                      }
                    : {
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.6)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }
                }
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Preview */}
      <div className="overflow-auto">
        {activePlatform === "facebook" && <FacebookPreview {...previewProps} />}
        {activePlatform === "instagram" && <InstagramPreview {...previewProps} />}
        {activePlatform === "linkedin" && <LinkedInPreview {...previewProps} />}
        {activePlatform === "twitter" && <TwitterPreview {...previewProps} />}
        {activePlatform === "google_business" && (
          <GoogleBusinessPreview {...previewProps} />
        )}
        {activePlatform === "tiktok" && (
          <div className="rounded-xl bg-black text-white p-6 text-center max-w-xs">
            <p className="text-sm text-white/60 mb-2">TikTok Caption Preview</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {content || <span className="text-white/30 italic">Caption will appear here…</span>}
            </p>
            {hashtags && (
              <p className="text-xs mt-2 text-pink-400">{hashtags}</p>
            )}
          </div>
        )}
      </div>

      {/* Platform label */}
      <p className="text-[11px] text-white/30 text-center">
        Preview — {PLATFORM_META[activePlatform].label}
      </p>
    </div>
  );
}
