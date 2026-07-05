/** Generate a 13-digit numeric code for a book barcode (EAN-13-ish, not registered). */
export function generateBarcode(): string {
  let code = "200"; // internal-use prefix
  for (let i = 0; i < 10; i++) code += Math.floor(Math.random() * 10);
  return code;
}
