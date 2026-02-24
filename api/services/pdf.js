const pdfParse = require("pdf-parse");

async function extractTextFromPdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text.trim();
    if (!text || text.length < 50) {
      throw new Error("No readable text found in PDF. The file may be image-based or scanned. Please paste the CV text manually.");
    }
    return text;
  } catch (err) {
    if (err.message.includes("No readable")) throw err;
    throw new Error("PDF parsing failed: " + err.message);
  }
}

module.exports = { extractTextFromPdf };
