import React from 'react';

/**
 * Lightweight markdown renderer for quote/invoice line-item descriptions.
 * Supports a deliberately small subset, matching the backend `markdown_to_paragraph_html` helper:
 *   **bold**, *italic*, ## subheading, "- " / "* " / "• " bullets, blank lines as paragraph breaks.
 * No external dependency to keep bundle size low.
 */

function renderInline(text) {
  // Replace **bold** and *italic* into <span> nodes
  const parts = [];
  let remaining = text;
  let key = 0;
  const boldRe = /\*\*(.+?)\*\*/;
  const italicRe = /(?<!\*)\*([^*\n]+)\*(?!\*)/;
  while (remaining.length) {
    const b = remaining.match(boldRe);
    const i = remaining.match(italicRe);
    let pick = null;
    if (b && (!i || b.index <= i.index)) pick = { kind: 'b', m: b };
    else if (i) pick = { kind: 'i', m: i };
    if (!pick) {
      parts.push(remaining);
      break;
    }
    if (pick.m.index > 0) parts.push(remaining.slice(0, pick.m.index));
    if (pick.kind === 'b') {
      parts.push(<strong key={`b-${key++}`}>{pick.m[1]}</strong>);
    } else {
      parts.push(<em key={`i-${key++}`}>{pick.m[1]}</em>);
    }
    remaining = remaining.slice(pick.m.index + pick.m[0].length);
  }
  return parts;
}

export default function DescriptionView({ text, className = '', style = {} }) {
  if (!text) return null;
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const blocks = [];
  let bulletGroup = null;
  let key = 0;

  const flushBullets = () => {
    if (bulletGroup) {
      blocks.push(
        <ul
          key={`ul-${key++}`}
          className="list-disc pl-5 space-y-0.5"
          style={{ color: '#1F2937' }}
        >
          {bulletGroup.map((b, idx) => (
            <li key={idx}>{renderInline(b)}</li>
          ))}
        </ul>
      );
      bulletGroup = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      blocks.push(<div key={`sp-${key++}`} className="h-2" />);
      continue;
    }
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (!bulletGroup) bulletGroup = [];
      bulletGroup.push(bulletMatch[1]);
      continue;
    }
    flushBullets();
    if (line.startsWith('## ')) {
      blocks.push(
        <div
          key={`h-${key++}`}
          className="font-semibold mt-2"
          style={{ color: '#500000' }}
        >
          {renderInline(line.slice(3).trim())}
        </div>
      );
      continue;
    }
    blocks.push(
      <p key={`p-${key++}`} className="leading-relaxed" style={{ color: '#1F2937' }}>
        {renderInline(line)}
      </p>
    );
  }
  flushBullets();

  return (
    <div className={`text-sm space-y-1 ${className}`} style={style}>
      {blocks}
    </div>
  );
}
