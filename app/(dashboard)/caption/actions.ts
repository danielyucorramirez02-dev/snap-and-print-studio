"use server";

const STUDIO_ADDRESS =
  'Phase 5, Block 22, Lot 37 Pandi Residence 1, Mapulang Lupa, Pandi Bulacan (also searchable on Waze/Google Maps as "Snap & Print Studio")';

const FUN_PROMPT = `You are a social media copywriter for Snap & Print Studio, a photo studio in Pandi, Bulacan, Philippines. Write a short, catchy English Facebook caption for these studio session photos.

Requirements:
- Tone: fun, playful, and energetic — use emojis
- 2–3 sentences maximum
- Mention "Snap & Print Studio" naturally
- Include a call-to-action to book or send a DM
- Include the studio address: ${STUDIO_ADDRESS}
- End with 6–8 relevant photography and lifestyle hashtags
- Write in English only`;

const WARM_PROMPT = `You are a social media copywriter for Snap & Print Studio, a photo studio in Pandi, Bulacan, Philippines. Write a short, heartfelt English Facebook caption for these studio session photos.

Requirements:
- Tone: warm, elegant, and emotional
- 2–3 sentences maximum
- Mention "Snap & Print Studio" naturally
- Include a call-to-action to book a session
- Include the studio address: ${STUDIO_ADDRESS}
- End with 6–8 relevant photography hashtags
- Write in English only`;

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

    const data = await response.json();
    const caption: string | undefined = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text)
      .filter(Boolean)
      .join("")
      .trim();

    if (!caption) {
      return { error: "No caption was generated. Please try again." };
    }

    return { caption };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Generation failed: ${message}` };
  }
}
