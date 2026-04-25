interface ContentRendererProps {
  content: string;
}

export default function ContentRenderer({ content }: ContentRendererProps) {
  const lines = content.split("\n");

  const elements: React.ReactElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line → skip (will be handled by paragraph margins)
    if (trimmed === "") {
      i++;
      continue;
    }

    // Heading: "To Do:" or similar
    if (trimmed.endsWith(":") && !trimmed.startsWith("-") && !trimmed.match(/^\d+\./)) {
      elements.push(
        <p key={i} className="text-[15px] font-semibold text-cabinet-ink mt-5 mb-1">
          {trimmed}
        </p>
      );
      i++;
      continue;
    }

    // Todo item: "- [ ] ..."
    if (trimmed.startsWith("- [ ]")) {
      const text = trimmed.slice(5).trim();
      elements.push(
        <div key={i} className="flex items-start gap-2 text-[15px] text-cabinet-ink leading-[1.7]">
          <span className="text-cabinet-ink2 select-none mt-[1px]">[ ]</span>
          <span>{text}</span>
        </div>
      );
      i++;
      continue;
    }

    // Unordered list: "- ..."
    if (trimmed.startsWith("- ")) {
      const text = trimmed.slice(2);
      // Check if it's a bold list item like "- Colors: ..."
      const boldMatch = text.match(/^([^:]+):\s*(.+)$/);
      if (boldMatch) {
        elements.push(
          <div key={i} className="flex items-start gap-2 text-[15px] text-cabinet-ink leading-[1.7]">
            <span className="text-cabinet-ink2 select-none">-</span>
            <span>
              <strong>{boldMatch[1]}:</strong> {boldMatch[2]}
            </span>
          </div>
        );
      } else {
        elements.push(
          <div key={i} className="flex items-start gap-2 text-[15px] text-cabinet-ink leading-[1.7]">
            <span className="text-cabinet-ink2 select-none">-</span>
            <span>{text}</span>
          </div>
        );
      }
      i++;
      continue;
    }

    // Ordered list: "1. ..." "2. ..."
    const orderedMatch = trimmed.match(/^(\d+)\.\s*(.+)$/);
    if (orderedMatch) {
      elements.push(
        <p key={i} className="text-[15px] text-cabinet-ink leading-[1.7] mt-4">
          <strong>{orderedMatch[1]}. {orderedMatch[2]}</strong>
        </p>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-[15px] text-cabinet-ink leading-[1.7] mt-1">
        {trimmed}
      </p>
    );
    i++;
  }

  return <div className="space-y-0">{elements}</div>;
}
