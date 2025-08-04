import React, { useState } from 'react';
import type { FileMetadata, DataContext } from '../types';
import { PencilIcon } from './icons';

interface DataContextFormProps {
  metadata: FileMetadata;
  onContinue: (context: DataContext) => void;
}

const DataContextForm: React.FC<DataContextFormProps> = ({ metadata, onContinue }) => {
  const [dataDescription, setDataDescription] = useState('');
  const [columnDescriptions, setColumnDescriptions] = useState<Record<string, string>>({});

  const handleColumnChange = (column: string, value: string) => {
    setColumnDescriptions((prev) => ({ ...prev, [column]: value }));
  };

  const handleContinue = () => {
    onContinue({ dataDescription, columnDescriptions });
  };
  
  const handleSkip = () => {
    onContinue({ dataDescription: '', columnDescriptions: {} });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-zinc-900/70 backdrop-blur-xl rounded-xl shadow-2xl border border-zinc-700/50 p-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Provide Data Context (Optional)</h1>
      <p className="text-gray-400 mb-8">
        Help the AI understand your data better by providing a brief description and explaining what each column means.
      </p>

      <div className="space-y-6">
        <div>
          <label htmlFor="data-description" className="block text-sm font-medium text-gray-300 mb-1">
            Overall Data Description
          </label>
          <textarea
            id="data-description"
            rows={3}
            value={dataDescription}
            onChange={(e) => setDataDescription(e.target.value)}
            className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] text-gray-200 placeholder:text-gray-500"
            placeholder="e.g., This dataset contains monthly sales records for our stores in North America."
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-100 mb-3">Column Descriptions</h2>
          <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
            {metadata.columns.map((col) => (
              <div key={col} className="flex items-start gap-3">
                <div className="flex-shrink-0 h-10 flex items-center">
                    <PencilIcon className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-grow">
                  <label htmlFor={`col-${col}`} className="block text-sm font-medium text-gray-300">
                    {col}
                  </label>
                  <input
                    type="text"
                    id={`col-${col}`}
                    value={columnDescriptions[col] || ''}
                    onChange={(e) => handleColumnChange(col, e.target.value)}
                    className="w-full mt-1 p-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] text-gray-200 placeholder:text-gray-500"
                    placeholder={`Explain what "${col}" represents...`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-sm font-semibold text-gray-300 bg-transparent rounded-md hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500"
        >
          Skip for Now
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-2 text-sm font-semibold text-zinc-900 bg-gradient-to-r from-[#39FF14] to-[#00C9A7] rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39FF14]"
          style={{boxShadow: '0 4px 20px -5px rgba(0, 201, 167, 0.5)'}}
        >
          Continue to Chat
        </button>
      </div>
    </div>
  );
};

export default DataContextForm;