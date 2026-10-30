/**
 * Strict, browser-local text import. Never changes the saved analysis;
 * callers commit the returned text only after validation succeeds.
 */
export const MAX_TEXT_IMPORT_FILE_BYTES = 60_000;
export const MAX_TEXT_IMPORT_CHARACTERS = 12_000;
export type TextImportFile = Pick<File, "name" | "size" | "arrayBuffer">;

export async function parseTextImport(file: TextImportFile): Promise<string> {
  if (!/\.(txt|md)$/i.test(file.name)) {
    throw new Error("Please select a .txt or .md document. Other file types are not supported.");
  }
  if (!Number.isFinite(file.size) || file.size < 0 || file.size > MAX_TEXT_IMPORT_FILE_BYTES) {
    throw new Error("The file is too large for this demo. Import a short excerpt instead.");
  }
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_TEXT_IMPORT_FILE_BYTES) {
    throw new Error("The file is too large for this demo. Import a short excerpt instead.");
  }
  let text: string;
  try {
    // File.text() silently inserts replacement characters into invalid UTF-8,
    // which can alter dates, figures and quotations before they are analyzed.
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    throw new Error("This text file is not valid UTF-8. Convert it to UTF-8 before importing.");
  }
  if (text.length > MAX_TEXT_IMPORT_CHARACTERS) {
    throw new Error("This file exceeds the 12,000-character limit. Shorten it before importing.");
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) {
    throw new Error("This file contains binary or unsupported control characters. Import plain UTF-8 text.");
  }
  return text;
}
