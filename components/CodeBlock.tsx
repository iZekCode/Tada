import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from './icons';

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="bg-zinc-900 rounded-lg relative group border border-zinc-700">
      <div className="absolute top-2 right-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-300 bg-zinc-700/50 rounded-md hover:bg-zinc-600/50 transition-colors"
        >
          {isCopied ? (
            <>
              <CheckIcon className="w-3.5 h-3.5 text-[#39FF14]" />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-sm text-white overflow-x-auto rounded-lg">
        <code className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;