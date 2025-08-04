import React from 'react';

interface MarkdownRendererProps {
  text: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  const renderLine = (line: string) => {
    return line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold text-gray-200">{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
  };

  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
          {currentList.map((item, i) => (
            <li key={i}>{renderLine(item.replace(/^[-*]\s*/, ''))}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      currentList.push(line.trim());
    } else {
      flushList();
      if (line.trim()) {
        elements.push(<p key={`p-${elements.length}`}>{renderLine(line)}</p>);
      }
    }
  });

  flushList(); // Flush any remaining list items at the end

  return <div className="text-base text-gray-400 space-y-2">{elements}</div>;
};

export default MarkdownRenderer;