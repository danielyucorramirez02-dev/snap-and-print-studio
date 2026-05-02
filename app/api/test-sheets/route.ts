import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!sheetId) {
    return NextResponse.json({ ok: false, step: "env", error: "GOOGLE_SHEET_ID is not set in environment variables." });
  }
  if (!rawKey) {
    return NextResponse.json({ ok: false, step: "env", error: "GOOGLE_SERVICE_ACCOUNT_KEY is not set in environment variables." });
  }

  let credentials: Record<string, string>;
  try {
    credentials = JSON.parse(rawKey);
  } catch {
    return NextResponse.json({ ok: false, step: "parse", error: "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Check how it was pasted into Vercel." });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // Try a lightweight read to confirm access
    const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: "spreadsheetId,properties.title" });

    return NextResponse.json({
      ok: true,
      sheetId,
      sheetTitle: res.data.properties?.title,
      serviceAccount: credentials.client_email,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, step: "sheets_api", error: message, serviceAccount: credentials.client_email, sheetId });
  }
}
