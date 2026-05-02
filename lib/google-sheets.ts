import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function getSheets() {
  if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return null;
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return { sheets: google.sheets({ version: "v4", auth }), sheetId: SHEET_ID };
  } catch {
    return null;
  }
}

export async function logBookingToSheet(data: {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  bookingDate: string;
  bookingTime: string;
  packageName: string;
  addons: string;
  total: number;
  downpayment: number;
  balance: number;
  bookingStatus: string;
  paymentStatus: string;
  receiptUrl?: string | null;
}) {
  const client = getSheets();
  if (!client) return;

  const submittedAt = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  const receiptCell = data.receiptUrl
    ? `=HYPERLINK("${data.receiptUrl}","View Receipt")`
    : "";

  try {
    await client.sheets.spreadsheets.values.append({
      spreadsheetId: client.sheetId,
      range: "Bookings!A:O",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          submittedAt,
          data.clientName,
          data.clientPhone,
          data.clientEmail || "",
          data.bookingDate,
          data.bookingTime,
          data.packageName,
          data.addons || "",
          `₱${data.total.toLocaleString()}`,
          `₱${data.downpayment.toLocaleString()}`,
          `₱${data.balance.toLocaleString()}`,
          data.bookingStatus,
          data.paymentStatus,
          receiptCell,
        ]],
      },
    });
  } catch (err) {
    // Non-blocking — booking still succeeds even if Sheets fails
    console.error("[Google Sheets] logBookingToSheet failed:", err);
  }
}

export async function logInventoryToSheet(data: {
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  lowStockThreshold: number;
}) {
  const client = getSheets();
  if (!client) return;

  const addedAt = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });

  try {
    await client.sheets.spreadsheets.values.append({
      spreadsheetId: client.sheetId,
      range: "Inventory!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          addedAt,
          data.itemName,
          data.quantity,
          data.unit,
          `₱${data.unitCost.toLocaleString()}`,
          `₱${data.sellingPrice.toLocaleString()}`,
          data.supplier || "",
          data.lowStockThreshold,
        ]],
      },
    });
  } catch (err) {
    console.error("[Google Sheets] logInventoryToSheet failed:", err);
  }
}
