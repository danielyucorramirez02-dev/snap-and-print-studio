"use server";

const STUDIO_ADDRESS =
  'Phase 5, Block 22, Lot 37 Pandi Residence 1, Mapulang Lupa, Pandi Bulacan (also searchable on Waze/Google Maps as "Snap & Print Studio")';

// Shared voice — modern Gen Z / Gen Alpha, NOT a polished millennial brand voice.
const CAPTION_STYLE = `Voice — write like a real Gen Z / Gen Alpha person posting in 2026, NOT like a millennial brand account:
- Casual and conversational — it should read like a real person, not an ad. BUT use normal sentence capitalization (proper sentences; always capitalize "Snap & Print Studio"). Do NOT write in all-lowercase — this is a business page and it must still look professional.
- Short and punchy — 1 to 2 lines before the hashtags. No long paragraphs.
- Start with a specific, real observation about THIS exact photo — the outfit, theme, colors, expression, pose, or what the subject is doing. Being concrete and specific is what keeps every caption different and stops it sounding generic and templated.
- A light touch of casual modern language is okay, but do NOT lean on stock slang. Use at most one casual phrase, make it feel natural, and vary it every time — never write an interchangeable, copy-paste-feeling caption.
- Light, natural Taglish is good (this is a Filipino studio) — a few Tagalog words mixed in, not a full translation.
- Use a few emojis — around 3 to 5 — placed naturally within the text where they fit the vibe (not stacked together in a decorative row).
- No hype punctuation, no "Book your slot today!!!" energy. Keep the call-to-action chill and short, like "dm us to book" or "book na".
- End with 8 to 12 relevant hashtags — mix photography tags, the session vibe, and local tags (Pandi, Bulacan). Use CamelCase for multi-word ones so they stay readable (e.g. #KidsPhotography).
- Banned phrases — overused and cringe, never use them: "understood the assignment", "main character" / "main character energy", "it's giving ___", "ate" / "ate and left no crumbs", "slay", "lowkey", "is just everything" / "___ is everything". Also avoid millennial tells like "Look at this cutie!", "Bring out your ___ side", stacked emojis like 🥰✨📸, and overly polished marketing copy.`;

const PHOTO_GROUNDING = `Look carefully at the photo(s) and describe ONLY what is actually shown: how many people there are and who they are (a child, a teen, an adult, a couple, a barkada, or a family). Never call it a family or group shoot when only one person is shown. Do not invent people, events, or details that are not visible.`;

const FUN_PROMPT = `You run the Facebook page for Snap & Print Studio, a photo studio in Pandi, Bulacan, Philippines. Write a Facebook caption for these studio session photos.

${CAPTION_STYLE}

Also:
- ${PHOTO_GROUNDING}
- Energy: fun, playful, a little chaotic-cute.
- Mention "Snap & Print Studio" once, naturally.
- Add the studio address as one short line: ${STUDIO_ADDRESS}`;

const WARM_PROMPT = `You run the Facebook page for Snap & Print Studio, a photo studio in Pandi, Bulacan, Philippines. Write a Facebook caption for these studio session photos.

${CAPTION_STYLE}

Also:
- ${PHOTO_GROUNDING}
- Energy: soft, warm, a little emotional — still modern and casual, just gentler. Go easier on the slang here.
- Mention "Snap & Print Studio" once, naturally.
- Add the studio address as one short line: ${STUDIO_ADDRESS}`;

// Gemini 2.5 Flash — multimodal: it reads the photos and writes the caption.
const GEMINI_MODEL = "gemini-2.5-flash";

interface InlineImage {
  mimeType: string;
  data: string;
}

// Split a "data:image/jpeg;base64,XXXX" URL into its mime type and raw base64.
function parseDataUrl(dataUrl: string): InlineImage | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function extractCaption(data: unknown): string | null {
  const candidate = data as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const caption = candidate.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join("")
    .trim();

  return caption || null;
}

export async function generateCaption(
  base64Images: string[],
  sessionType: "self-shoot" | "milestone" | "coverage"
): Promise<{ caption: string } | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      error:
        "Gemini API key is not set. Add GEMINI_API_KEY to your .env.local file (and to Vercel).",
    };
  }

  if (base64Images.length === 0) {
    return { error: "Please upload at least one photo." };
  }

  const prompt = sessionType === "self-shoot" ? FUN_PROMPT : WARM_PROMPT;

  // Gemini request: the prompt text followed by each photo inline.
  const parts: Array<
    { text: string } | { inline_data: { mime_type: string; data: string } }
  > = [{ text: prompt }];
  for (const url of base64Images) {
    const img = parseDataUrl(url);
    if (img) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
    }
  }

  if (parts.length === 1) {
    return { error: "Those photos could not be read. Please try again." };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 600,
            // A short caption needs no "thinking" budget — keeps it fast.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return {
        error: `Generation failed: ${response.status} ${detail.slice(0, 200)}`,
      };
    }

    const data: unknown = await response.json();
    const caption = extractCaption(data);

    if (!caption) {
      return { error: "No caption was generated. Please try again." };
    }

    return { caption };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Generation failed: ${message}` };
  }
}

export async function modifyCaption(
  currentCaption: string,
  instruction: string
): Promise<{ caption: string } | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      error:
        "Gemini API key is not set. Add GEMINI_API_KEY to your .env.local file (and to Vercel).",
    };
  }

  const cleanCaption = currentCaption.trim();
  const cleanInstruction = instruction.trim();

  if (!cleanCaption) {
    return { error: "Generate a caption first, then tell me how to modify it." };
  }

  if (!cleanInstruction) {
    return { error: "Tell me what to change, like make it shorter or more Taglish." };
  }

  const prompt = `Revise this Facebook caption for Snap & Print Studio based on the user's instruction.

Keep the same facts, studio name, address, and photo/session context. Do not invent new photo details. Keep hashtags unless the user specifically asks to change/remove them.

User instruction:
${cleanInstruction}

Current caption:
${cleanCaption}

Return only the revised caption.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return {
        error: `Modification failed: ${response.status} ${detail.slice(0, 200)}`,
      };
    }

    const data: unknown = await response.json();
    const caption = extractCaption(data);

    if (!caption) {
      return { error: "No revised caption was generated. Please try again." };
    }

    return { caption };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Modification failed: ${message}` };
  }
}
