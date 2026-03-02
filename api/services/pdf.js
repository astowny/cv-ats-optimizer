// Importer directement le fichier lib pour éviter les problèmes d'interop ESM/CJS de pdf-parse v2
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

async function extractTextFromPdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text.trim();
    if (!text || text.length < 50) {
      throw new Error("Aucun texte lisible trouvé dans le PDF. Le fichier est peut-être scanné ou en image. Veuillez coller le texte du CV manuellement.");
    }
    return text;
  } catch (err) {
    if (err.message.includes("No readable")) throw err;
    throw new Error("PDF parsing failed: " + err.message);
  }
}

module.exports = { extractTextFromPdf };
