function toUtf16BeHex(text: string) {
  const bytes = ['FE', 'FF'];
  const normalized = text.replace(/[^\u0000-\uffff]/g, '');
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    const hex = code.toString(16).padStart(4, '0').toUpperCase();
    bytes.push(hex.slice(0, 2));
    bytes.push(hex.slice(2, 4));
  }
  return bytes.join('');
}

function wrapLine(text: string, maxLength = 42) {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (current.length >= maxLength) {
      lines.push(current);
      current = '';
    }
    current += char;
  }
  if (current) lines.push(current);
  return lines;
}

export function createTextPdf(lines: string[]) {
  const pageLines = lines.flatMap((line) => wrapLine(line));
  let y = 790;
  const content = pageLines
    .slice(0, 42)
    .map((line, index) => {
      const fontSize = index === 0 ? 18 : 10;
      const nextY = y;
      y -= index === 0 ? 30 : 16;
      return `BT /F1 ${fontSize} Tf 48 ${nextY} Td <${toUtf16BeHex(line)}> Tj ET`;
    })
    .join('\n');

  const streamContent = `${content}\n`;
  const stream = Buffer.from(streamContent, 'utf8');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UCS2-H /DescendantFonts [5 0 R] >>',
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 5 >> >>',
    `<< /Length ${stream.length} >>\nstream\n${streamContent}endstream`
  ];

  let body = '%PDF-1.7\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, 'utf8');
}
