import React from 'react';
import Papa from 'papaparse';
import type { AnalysisResult } from '../types';
import { DownloadIcon } from './icons';

interface ActionButtonsProps {
  result: AnalysisResult;
  onAction: (action: string, data: any) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ result, onAction }) => {
  const handleExport = () => {
    if (result.type !== 'table' || !result.data || result.data.length === 0) return;

    const csv = Papa.unparse(result.data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${result.title.replace(/\s/g, '_') || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderButtons = () => {
    if (result.type === 'table' && result.data && result.data.length > 0) {
      return (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#c0ffc5] bg-[#39FF14]/10 rounded-md hover:bg-[#39FF14]/20 transition-colors"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export as CSV
          </button>
      );
    }
    return null;
  };
  
  const buttons = renderButtons();

  if (!buttons) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-700/60">
      {buttons}
    </div>
  );
};

export default ActionButtons;