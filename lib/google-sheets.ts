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

// Column layout:
// A: Submitted At  B: Client Name  C: Phone  D: Email
// E: Booking Date  F: Booking Time  G: Package  H: Addons
// I: Total  J: Downpayment  K: Balance  L: Booking Status
// M: Payment Status  N: Downpayment Receipt  O: Booking ID  P: Session Gallery

async function findBookingRow(
  client: NonNullable<ReturnType<typeof getSheets>>,
  bookingId: string
): Promise<number | null> {
  try {
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "Bookings!O:O",
    });
    const values = response.data.values ?? [];
    for (let i = 1; i < values.length; i++) {
      if (values[i]?.[0] === bookingId) return i + 1; // 1-indexed row number
    }
    return null;
  } catch {
    return null;
  }
}

export async function logBookingToSheet(data: {
  bookingId?: string;
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
    // Ensure new column headers exist (idempotent — same values written every time)
    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.sheetId,
      range: "Bookings!O1:P1",
      valueInputOption: "RAW",
      requestBody: { values: [["Booking ID", "Session Gallery"]] },
    });

    await client.sheets.spreadsheets.values.append({
      spreadsheetId: client.sheetId,
      range: "Bookings!A:P",
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
          data.bookingId ?? "",
          "",
        ]],
      },
    });
  } catch (err) {
    console.error("[Google Sheets] logBookingToSheet failed:", err);
  }
}

export async function updateBookingInSheet(
  bookingId: string,
  updates: {
    bookingStatus?: string;
    paymentStatus?: string;
    total?: number;
    downpayment?: number;
    balance?: number;
    sessionGalleryUrl?: string;
  }
): Promise<void> {
  const client = getSheets();
  if (!client) return;

  try {
    const rowNum = await findBookingRow(client, bookingId);
    if (!rowNum) return;

    const batchData: Array<{ range: string; values: unknown[][] }> = [];

    if (updates.total !== undefined) {
      batchData.push({ range: `Bookings!I${rowNum}`, values: [[`₱${updates.total.toLocaleString()}`]] });
    }
    if (updates.downpayment !== undefined) {
      batchData.push({ range: `Bookings!J${rowNum}`, values: [[`₱${updates.downpayment.toLocaleString()}`]] });
    }
    if (updates.balance !== undefined) {
      batchData.push({ range: `Bookings!K${rowNum}`, values: [[`₱${updates.balance.toLocaleString()}`]] });
    }
    if (updates.bookingStatus !== undefined) {
      batchData.push({ range: `Bookings!L${rowNum}`, values: [[updates.bookingStatus]] });
    }
    if (updates.paymentStatus !== undefined) {
      batchData.push({ range: `Bookings!M${rowNum}`, values: [[updates.paymentStatus]] });
    }
    if (updates.sessionGalleryUrl !== undefined) {
      batchData.push({
        range: `Bookings!P${rowNum}`,
        values: [[`=HYPERLINK("${updates.sessionGalleryUrl}","View Gallery")`]],
      });
    }

    if (batchData.length === 0) return;

    await client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: client.sheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: batchData,
      },
    });
  } catch (err) {
    console.error("[Google Sheets] updateBookingInSheet failed:", err);
  }
}

export async function deleteBookingFromSheet(bookingId: string): Promise<void> {
  const client = getSheets();
  if (!client) return;

  try {
    const spreadsheet = await client.sheets.spreadsheets.get({
      spreadsheetId: client.sheetId,
    });

    const bookingsSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === "Bookings"
    );
    if (!bookingsSheet) return;
    const numericSheetId = bookingsSheet.properties?.sheetId ?? 0;

    const rowNum = await findBookingRow(client, bookingId);
    if (!rowNum) return;

    await client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: client.sheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: numericSheetId,
              dimension: "ROWS",
              startIndex: rowNum - 1, // 0-indexed
              endIndex: rowNum,        // exclusive
            },
          },
        }],
      },
    });
  } catch (err) {
    console.error("[Google Sheets] deleteBookingFromSheet failed:", err);
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
