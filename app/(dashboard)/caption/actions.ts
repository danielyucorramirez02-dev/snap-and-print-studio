"use server";

import Groq from "groq-sdk";

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

export async function generateCaption(
  base64Images: string[],
  sessionType: "self-shoot" | "milestone" | "coverage"
): Promise<{ caption: string } | { error: string }> {
  if (!process.env.GROQ_API_KEY) {
    return {
      error:
        "GROQ API key is not set. Add GROQ_API_KEY to your .env.local file.",
    };
  }

  if (base64Images.length === 0) {
    return { error: "Please upload at least one photo." };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = sessionType === "self-shoot" ? FUN_PROMPT : WARM_PROMPT;

  const imageContent = base64Images.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  try {
    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, ...imageContent],
        },
      ],
      max_tokens: 400,
    });

    const caption = response.choices[0]?.message?.content?.trim();
    if (!caption)
      return { error: "No caption was generated. Please try again." };

    return { caption };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Generation failed: ${message}` };
  }
}
