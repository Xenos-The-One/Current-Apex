/**
 * HeyGen API Service
 *
 * Wraps the HeyGen v2 REST API for the AI Content Hub.
 * All videos are Shorts-format (portrait 1080×1920, max 60 seconds).
 * One agency account — API key is shared across all clients.
 * Each client has their own avatar_id and voice_id stored in seo_clients.
 */

const HEYGEN_BASE = "https://api.heygen.com";

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY environment variable is not set");
  return key;
}

function headers() {
  return {
    "accept": "application/json",
    "content-type": "application/json",
    "x-api-key": getApiKey(),
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender: string;
  preview_image_url: string;
  preview_video_url: string;
}

export interface HeyGenVoice {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  preview_audio: string;
  support_pause: boolean;
  emotion_support: boolean;
}

export interface CreateVideoInput {
  avatarId: string;
  voiceId: string;
  script: string;
  /** "portrait" = 1080×1920 (Shorts), "landscape" = 1920×1080, "square" = 1080×1080 */
  format?: "portrait" | "landscape" | "square";
  title?: string;
  /** Optional callback URL for webhook (we also poll manually) */
  callbackUrl?: string;
}

export interface VideoStatus {
  video_id: string;
  status: "processing" | "completed" | "failed" | "pending" | "waiting";
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  error?: string;
}

// ─── Dimension map ────────────────────────────────────────────────────────────

const DIMENSIONS: Record<string, { width: number; height: number }> = {
  portrait:  { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  square:    { width: 1080, height: 1080 },
};

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * List all avatars available on the agency HeyGen account.
 * Returns both stock and custom-trained avatars.
 */
export async function listAvatars(): Promise<HeyGenAvatar[]> {
  const res = await fetch(`${HEYGEN_BASE}/v2/avatars`, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen listAvatars failed (${res.status}): ${text}`);
  }
  const json = await res.json() as any;
  return json.data?.avatars ?? [];
}

/**
 * List all voices available on the agency HeyGen account.
 */
export async function listVoices(language?: string): Promise<HeyGenVoice[]> {
  const url = language
    ? `${HEYGEN_BASE}/v2/voices?language=${encodeURIComponent(language)}`
    : `${HEYGEN_BASE}/v2/voices`;
  const res = await fetch(url, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen listVoices failed (${res.status}): ${text}`);
  }
  const json = await res.json() as any;
  return json.data?.voices ?? [];
}

/**
 * Submit a video generation request to HeyGen.
 * Returns the video_id immediately — rendering is async (poll with getVideoStatus).
 *
 * Hard limits enforced here:
 *  - Max 60 seconds of script (≈ 150 words at normal speaking pace)
 *  - Portrait format by default (Shorts)
 */
export async function createVideo(input: CreateVideoInput): Promise<string> {
  const { avatarId, voiceId, script, format = "portrait", title, callbackUrl } = input;

  // Enforce 60-second max: truncate at ~150 words
  const words = script.trim().split(/\s+/);
  const cappedScript = words.length > 150 ? words.slice(0, 150).join(" ") + "..." : script;

  const dim = DIMENSIONS[format] ?? DIMENSIONS.portrait;

  const body: any = {
    title: title ?? `Content Hub Video`,
    dimension: { width: dim.width, height: dim.height },
    video_inputs: [
      {
        character: {
          type: "avatar",
          avatar_id: avatarId,
          avatar_style: "normal",
        },
        voice: {
          type: "text",
          input_text: cappedScript,
          voice_id: voiceId,
          speed: 1.0,
        },
        background: {
          type: "color",
          value: "#000000",
        },
      },
    ],
  };

  if (callbackUrl) body.callback_url = callbackUrl;

  const res = await fetch(`${HEYGEN_BASE}/v2/video/generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen createVideo failed (${res.status}): ${text}`);
  }

  const json = await res.json() as any;
  const videoId = json.data?.video_id;
  if (!videoId) throw new Error(`HeyGen createVideo: no video_id in response: ${JSON.stringify(json)}`);
  return videoId;
}

/**
 * Poll the status of a HeyGen video by video_id.
 * Call this every 60 seconds until status is "completed" or "failed".
 */
export async function getVideoStatus(videoId: string): Promise<VideoStatus> {
  const res = await fetch(`${HEYGEN_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen getVideoStatus failed (${res.status}): ${text}`);
  }
  const json = await res.json() as any;
  const d = json.data;
  return {
    video_id: videoId,
    status: d?.status ?? "pending",
    video_url: d?.video_url,
    thumbnail_url: d?.thumbnail_url,
    duration: d?.duration,
    error: d?.error,
  };
}

// ─── Video Agent ─────────────────────────────────────────────────────────────

export interface VideoAgentInput {
  /** Natural language prompt describing the video — script, style, B-roll, overlays, CTA */
  prompt: string;
  /** Tim's avatar ID */
  avatarId?: string;
  /** Approximate duration in seconds (min 5) */
  durationSec?: number;
  /** portrait (Shorts/Reels/TikTok) or landscape (YouTube) */
  orientation?: "portrait" | "landscape";
  /** Optional asset URLs the Video Agent can reference */
  files?: Array<{ url: string; type: string }>;
}

export interface VideoAgentResponse {
  /** The video_id returned by the Video Agent — poll with getVideoStatus() */
  videoId: string;
  /** The raw response from HeyGen for debugging */
  raw?: any;
}

/**
 * Submit a video generation request to the HeyGen Video Agent.
 *
 * Unlike createVideo() which renders a raw avatar clip, the Video Agent:
 * - Reads the prompt and auto-generates relevant B-roll and stock footage
 * - Adds text overlays, lower thirds, and motion graphics based on context
 * - Applies intro/outro sequences if the avatar has them configured
 * - Uses the avatar's voice and appearance as defined in HeyGen Studio
 *
 * Returns the video_id immediately — rendering is async (poll with getVideoStatus).
 */
export async function createVideoWithAgent(input: VideoAgentInput): Promise<VideoAgentResponse> {
  const { prompt, avatarId, durationSec, orientation = "portrait", files } = input;

  const body: any = { prompt };

  // Build optional config object
  const config: any = {};
  if (avatarId) config.avatar_id = avatarId;
  if (durationSec && durationSec >= 5) config.duration_sec = durationSec;
  if (orientation) config.orientation = orientation;
  if (Object.keys(config).length > 0) body.config = config;

  // Optional asset references
  if (files && files.length > 0) body.files = files;

  const res = await fetch(`${HEYGEN_BASE}/v1/video_agent/generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen Video Agent failed (${res.status}): ${text}`);
  }

  const json = await res.json() as any;
  // Video Agent may return video_id at different paths depending on API version
  const videoId = json.data?.video_id ?? json.video_id ?? json.data?.id;
  if (!videoId) throw new Error(`HeyGen Video Agent: no video_id in response: ${JSON.stringify(json)}`);

  return { videoId, raw: json };
}

/**
 * Build a detailed Video Agent prompt from a content package.
 *
 * This is the key function that ensures every autonomously generated video
 * matches Tariq's quality standard. It injects:
 * - Brand voice and tone
 * - Script with hook and CTA
 * - Visual direction (B-roll, overlays, motion graphics)
 * - Platform-specific formatting
 * - NMLS compliance requirements
 */
export function buildVideoAgentPrompt(params: {
  script: string;
  topic: string;
  brandName: string;
  targetAudience: string;
  brandVoice: string;
  platform: string;
  hook: string;
  cta: string;
  isLongForm?: boolean;
  nmlsNumber?: string;
}): string {
  const { script, topic, brandName, targetAudience, brandVoice, platform, hook, cta, isLongForm, nmlsNumber } = params;

  const duration = isLongForm ? "8-12 minutes" : "45-60 seconds";
  const style = isLongForm
    ? "YouTube long-form educational video with chapters, B-roll cutaways, and data visualizations"
    : `${platform} short-form vertical video (9:16 portrait) with punchy text overlays and motion graphics`;

  const compliance = nmlsNumber
    ? `Include "NMLS #${nmlsNumber}" as a persistent lower-third or footer throughout the video. This is a licensed mortgage professional and compliance text is required.`
    : "Include appropriate financial disclaimer text in the footer.";

  // Golden example patterns extracted from Tim's approved videos
  // Video 1: Nevada Essential Worker Program (original golden example)
  // Video 2: Refinance Reel — CDN: https://files.manuscdn.com/user_upload_by_module/session_file/310519663346016577/iooPNjGKxbimTDMl.mp4
  const goldenExamplePattern = !isLongForm ? `
GOLDEN EXAMPLE SCRIPT STRUCTURE (follow this exact pattern — derived from 2 approved videos):
1. HOOK (0-8 sec): Bold statement of value + exclusivity + specific dollar amount or number
   Example: "There is an assistance program available right now that offers $20,000 for your down payment and closing costs, but it's specifically for essential workers."
2. QUALIFICATION EXPANSION (8-25 sec): "Who qualifies? It's broader than you think." + specific relatable examples by category
3. KEY REQUIREMENTS (25-50 sec): Always use EXACT numbers (income limits, credit scores, specific figures) — this builds credibility
4. URGENCY/SCARCITY (50-60 sec): Use real scarcity with specific numbers ("Only 579 reservations left") — never fake urgency
5. CTA (60-70 sec): "Send me a DM with the word [KEYWORD] right now to see if you qualify. Let's get you into your new home."

GOLDEN EXAMPLE #2 — REFINANCE REEL STRUCTURE (alternate pattern for refinance/rate topics):
1. HOOK (0-5 sec): Provocative question or bold claim about rates/savings
   Example: "Your mortgage rate is costing you more than you think. Here's what most people don't realize..."
2. PROBLEM STATEMENT (5-15 sec): Explain the pain point with specific numbers — monthly payment differences, total interest over loan life
3. SOLUTION REVEAL (15-35 sec): Present the refinance opportunity with exact current rates, savings calculations, and timeline
4. OBJECTION HANDLING (35-50 sec): Address common fears — "But what about closing costs?" "What if rates drop more?" — with data
5. URGENCY + CTA (50-65 sec): Rate lock window, market timing, and clear next step — "DM me [KEYWORD] to get your free rate analysis"

SCRIPT STYLE RULES (apply to ALL videos):
- Speak directly to working-class people in plain English — no mortgage jargon
- Always use exact numbers and specific figures — this is what builds trust
- Proactively handle objections: "it's broader than you think", "you don't have to be..."
- Warm, personal close — partnership language ("Let's get you...")
- Steady, clear delivery — not rushed
- For refinance topics: lead with savings amount, show before/after payment comparison
- For purchase topics: lead with program benefit amount, expand who qualifies
` : "";

  return `Create a ${duration} ${style} for ${brandName}.

TOPIC: ${topic}

HOOK (first 3 seconds — must grab attention immediately): ${hook}

SCRIPT:
${script}
${goldenExamplePattern}
CALL TO ACTION: ${cta}

BRAND VOICE: ${brandVoice}
TARGET AUDIENCE: ${targetAudience}

VISUAL DIRECTION:
- Use the provided avatar for all talking-head segments
- Add relevant B-roll footage that visually matches the topic (mortgage documents, homes, financial charts, calculators, happy families, etc.)
- Include bold, high-contrast text overlays for key statistics, important points, and the hook
- Add lower thirds with the brand name${nmlsNumber ? ` and NMLS #${nmlsNumber}` : ""}
- Motion graphics and animated numbers for any statistics or percentages mentioned in the script
- Professional color grading: warm, trustworthy tones consistent with the financial services brand
- Captions/subtitles burned in for accessibility and silent-viewing
${isLongForm
  ? "- Chapter markers at logical content breaks\n- Professional intro sequence with brand logo\n- Outro screen with subscribe button and related video suggestions"
  : "- Fast-paced editing (cut every 2-3 seconds) to maintain attention\n- Trending-style transitions between cuts\n- Text pop animations on key words like the dollar amounts and key stats"}

COMPLIANCE: ${compliance}

QUALITY STANDARD: This video will be published on ${platform} for a professional mortgage brand. It must look polished, credible, and on par with top financial content creators. Do not use generic stock footage — use footage that directly relates to the specific topic being discussed.`;
}

/**
 * Get remaining video generation quota for the agency account.
 */
export async function getRemainingQuota(): Promise<{ remaining: number; total: number }> {
  const res = await fetch(`${HEYGEN_BASE}/v2/user/remaining_quota`, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen getRemainingQuota failed (${res.status}): ${text}`);
  }
  const json = await res.json() as any;
  return {
    remaining: json.data?.remaining_quota ?? 0,
    total: json.data?.total_quota ?? 0,
  };
}
