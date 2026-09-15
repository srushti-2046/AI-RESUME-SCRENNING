/**
 * Client & Server-side safe text extraction for PDF and DOCX files.
 * Uses native Web APIs (DecompressionStream, ArrayBuffer) supported in all modern browsers and Node 18+.
 */

// Simple SHA-256 calculation for duplicate detection foundation
export async function computeFileHash(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'hash_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Extracts plain text from a DOCX (ZIP archive containing word/document.xml)
 */
export async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(buffer);
    // Find local file headers in ZIP: PK\x03\x04
    let offset = 0;
    while (offset < bytes.length - 30) {
      if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4B && bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04) {
        const compMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
        const compSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
        const fileNameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
        const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);

        const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLen);
        const fileName = new TextDecoder().decode(fileNameBytes);

        const dataStart = offset + 30 + fileNameLen + extraLen;

        if (fileName === 'word/document.xml') {
          const compData = bytes.slice(dataStart, dataStart + compSize);
          let xmlStr = '';

          if (compMethod === 8 && typeof DecompressionStream !== 'undefined') {
            // Deflate decompressed
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compData);
            writer.close();
            const response = new Response(ds.readable);
            xmlStr = await response.text();
          } else {
            xmlStr = new TextDecoder().decode(compData);
          }

          // Extract text from <w:t> tags
          const textMatches = xmlStr.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
          if (textMatches && textMatches.length > 0) {
            return textMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
          }
          return xmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        offset = dataStart + compSize;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn('DOCX XML parsing error:', err);
  }

  // Fallback: extract ASCII text chunks
  const ascii = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const words = ascii.match(/[A-Za-z0-9@.,\-+/# ]{4,}/g);
  return words ? words.join(' ').trim() : '';
}

/**
 * Extracts plain text from a PDF file stream
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder('latin1').decode(bytes);

  const textPieces: string[] = [];

  // Look for text shown with ( ... ) Tj or ( ... ) ' or [ ... ] TJ
  const tjMatches = raw.match(/\(([^)]+)\)\s*(?:Tj|')/g);
  if (tjMatches && tjMatches.length > 0) {
    for (const m of tjMatches) {
      const match = m.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        textPieces.push(match[1].replace(/\\([()\\])/g, '$1'));
      }
    }
  }

  const arrayTjMatches = raw.match(/\[([^\]]+)\]\s*TJ/g);
  if (arrayTjMatches && arrayTjMatches.length > 0) {
    for (const m of arrayTjMatches) {
      const innerMatches = m.match(/\(([^)]+)\)/g);
      if (innerMatches) {
        for (const item of innerMatches) {
          textPieces.push(item.slice(1, -1).replace(/\\([()\\])/g, '$1'));
        }
      }
    }
  }

  // If text objects were found
  if (textPieces.length > 10) {
    return textPieces.join(' ').replace(/\s+/g, ' ').trim();
  }

  // Fallback: extract clean alphanumeric lines from PDF streams
  const readable = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const words = readable.match(/[A-Za-z0-9@.,\-+/#:]{3,}/g);
  return words ? words.filter(w => !w.startsWith('/') && !w.includes('obj') && !w.includes('endobj')).join(' ') : '';
}

/**
 * Main dispatcher based on MIME type or file extension
 */
export async function extractResumeText(file: File | { name: string; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<string> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();

  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const text = await extractTextFromDocx(buffer);
    if (text && text.length > 20) return text;
  }

  if (name.endsWith('.pdf')) {
    const text = await extractTextFromPdf(buffer);
    if (text && text.length > 20) return text;
  }

  // Generic fallback
  const generic = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const clean = generic.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.slice(0, 100000);
}
