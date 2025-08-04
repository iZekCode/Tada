
import React, { useState } from 'react';
import type { AnalysisResult } from '../types';
import TableRenderer from './TableRenderer';
import ChartRenderer from './ChartRenderer';
import ActionButtons from './ActionButtons';
import ProfileRenderer from './ProfileRenderer';
import CodeBlock from './CodeBlock';
import { RefreshCwIcon, SparklesIcon, PinIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';

interface ResultRendererProps {
  result: AnalysisResult;
  onAction: (action: string, data: any) => void;
  onDrillDown: (category: string, queryHint: string) => void;
}

const ResultRenderer: React.FC<ResultRendererProps> = ({ result, onAction, onDrillDown }) => {
  const [activeTab, setActiveTab] = useState<'Answer' | 'Python' | 'SQL'>('Answer');
  const [pinSuccess, setPinSuccess] = useState(false);

  const hasCode = result.pythonCode || result.sqlCode;
  // 'chart' is handled inside ChartRenderer now
  const isPinnable = ['table', 'statistics', 'value'].includes(result.type) && result.title;

  const handlePin = () => {
    onAction('pin_to_dashboard', { result });
    setPinSuccess(true);
    setTimeout(() => setPinSuccess(false), 2000);
  };

  const renderAnswer = () => {
    switch (result.type) {
      case 'profile':
        return <ProfileRenderer data={result.data} onAction={onAction} />;
      case 'table':
        return <TableRenderer data={result.data} />;
      case 'chart':
        return <ChartRenderer data={result.data} onDrillDown={onDrillDown} onAction={onAction} result={result} />;
      case 'statistics':
        if (!result.data?.payload || !Array.isArray(result.data.payload) || result.data.payload.length === 0) {
            return <p className="text-gray-500">No statistics to display.</p>;
        }
        return (
            <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 backdrop-blur-sm space-y-3">
                {(result.data.payload as { statistic: string; value: string | number }[]).map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-base py-2.5 border-b border-zinc-700/50 last:border-b-0">
                        <span className="text-gray-400">{item.statistic}</span>
                        <span className="font-semibold text-gray-100 text-right">{String(item.value)}</span>
                    </div>
                ))}
            </div>
        );
      case 'value':
        if (result.data === null || result.data === undefined) {
          return null;
        }
        return (
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <p className="text-lg font-medium text-gray-100">{result.data}</p>
          </div>
        );
      case 'code_confirmation':
        return (
          <div className="space-y-4">
              <CodeBlock code={result.data.code} language="javascript" />
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-700/60">
                <button
                    onClick={() => onAction('cancel_fix', { id: result.id })}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-300 bg-zinc-700/50 rounded-md hover:bg-zinc-600/50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onAction('apply_fix', { code: result.data.code })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-gradient-to-r from-[#39FF14] to-[#00C9A7] rounded-md hover:opacity-90 transition-colors"
                >
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Apply Fix
                </button>
              </div>
          </div>
        )
      case 'error':
         return (
          <div className="bg-red-900/50 p-4 rounded-lg border border-red-800/50 text-red-300 space-y-3">
            <p>{result.data}</p>
            {result.originalQuery && (
              <div className="pt-3 border-t border-red-800/60">
                <button
                  onClick={() => onAction('retry', { query: result.originalQuery })}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-300 bg-red-500/10 rounded-md hover:bg-red-500/20"
                >
                  <RefreshCwIcon className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            )}
          </div>
        );
      default:
        return <p className="text-gray-500">Unsupported result type.</p>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start gap-2">
          {result.title && <h3 className="font-semibold text-gray-100 flex-1">{result.title}</h3>}
          {isPinnable && (
            <button
                onClick={handlePin}
                disabled={pinSuccess}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                    pinSuccess
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-700/50 text-gray-300 hover:bg-zinc-600/50'
                }`}
            >
                <PinIcon className="w-3.5 h-3.5" />
                {pinSuccess ? 'Pinned!' : 'Pin to Dashboard'}
            </button>
          )}
      </div>

      {result.summary && (
        <MarkdownRenderer text={result.summary} />
      )}

      {/* TABS */}
      {hasCode && result.type !== 'error' && (
        <div className="border-b border-zinc-700">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('Answer')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base transition-colors ${
                activeTab === 'Answer'
                  ? 'border-[#39FF14] text-[#39FF14]'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-zinc-600'
              }`}
            >
              Answer
            </button>
            {result.pythonCode && (
              <button
                onClick={() => setActiveTab('Python')}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'Python'
                    ? 'border-[#39FF14] text-[#39FF14]'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-zinc-600'
                }`}
              >
                Python
              </button>
            )}
            {result.sqlCode && (
              <button
                onClick={() => setActiveTab('SQL')}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'SQL'
                    ? 'border-[#39FF14] text-[#39FF14]'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-zinc-600'
                }`}
              >
                SQL
              </button>
            )}
          </nav>
        </div>
      )}

      {/* TAB CONTENT */}
      <div className="pt-2">
        {activeTab === 'Answer' && renderAnswer()}
        {activeTab === 'Python' && result.pythonCode && (
          <CodeBlock code={result.pythonCode} language="python" />
        )}
        {activeTab === 'SQL' && result.sqlCode && (
          <CodeBlock code={result.sqlCode} language="sql" />
        )}
      </div>

      {activeTab === 'Answer' && result.type === 'table' && result.data && Array.isArray(result.data) && result.data.length > 0 && (
          <ActionButtons result={result} onAction={onAction} />
      )}
    </div>
  );
};

export default ResultRenderer;
