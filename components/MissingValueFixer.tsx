import React, { useState } from 'react';
import type { ColumnProfile, DataQualityIssue } from '../types';
import { SparklesIcon } from './icons';

interface MissingValueFixerProps {
    config: {
        issue: DataQualityIssue;
        profile: ColumnProfile;
    };
    onApplyFix: (profile: ColumnProfile, strategy: string, customValue?: string | number) => void;
    onCancel: () => void;
}

const MissingValueFixer: React.FC<MissingValueFixerProps> = ({ config, onApplyFix, onCancel }) => {
    const { profile } = config;
    const isNumeric = profile.type === 'numeric';

    const getDefaultStrategy = () => {
        if (isNumeric) return 'fill_mean';
        return profile.stats.mode ? 'fill_mode' : 'remove_rows';
    };

    const [strategy, setStrategy] = useState<string>(getDefaultStrategy());
    const [customValue, setCustomValue] = useState<string>('');

    const handleApply = () => {
        if (strategy === 'fill_custom' && customValue.trim() === '') {
            // Basic validation for custom value
            return;
        }
        
        let finalCustomValue: string | number = customValue;
        if (isNumeric && strategy === 'fill_custom') {
            finalCustomValue = parseFloat(customValue);
            if (isNaN(finalCustomValue)) {
                // More robust validation could be added here
                return;
            }
        }

        onApplyFix(profile, strategy, strategy === 'fill_custom' ? finalCustomValue : undefined);
    };

    const numericOptions: { value: string; label: string; disabled?: boolean; }[] = [
        { value: 'fill_mean', label: `Fill with Mean (${profile.stats.mean?.toLocaleString()})` },
        { value: 'fill_median', label: `Fill with Median (${profile.stats.median?.toLocaleString()})` },
        { value: 'fill_zero', label: 'Fill with Zero' },
        { value: 'fill_custom', label: 'Fill with Custom Value' },
        { value: 'remove_rows', label: 'Remove Rows with Missing Values' },
    ];

    const categoricalOptions: { value: string; label: string; disabled?: boolean; }[] = [
        { value: 'fill_mode', label: `Fill with Mode ('${profile.stats.mode || 'N/A'}')`, disabled: !profile.stats.mode },
        { value: 'fill_custom', label: 'Fill with Custom Value' },
        { value: 'remove_rows', label: 'Remove Rows with Missing Values' },
    ];

    const options = isNumeric ? numericOptions : categoricalOptions;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-100">Fix Missing Values</h2>
                <div className="text-gray-400 text-sm">
                    <p>Column: <span className="font-semibold text-gray-300">{profile.column}</span></p>
                    <p>Issue: <span className="font-semibold text-gray-300">{config.issue.details}</span></p>
                </div>
                
                <div className="space-y-2">
                    <label htmlFor="fix-strategy" className="block text-sm font-medium text-gray-300">
                        Choose a strategy:
                    </label>
                    <select
                        id="fix-strategy"
                        value={strategy}
                        onChange={(e) => setStrategy(e.target.value)}
                        className="w-full p-2 bg-zinc-700 border border-zinc-600 rounded-md shadow-sm focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] text-gray-200"
                    >
                        {options.map(opt => (
                            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {strategy === 'fill_custom' && (
                     <div className="space-y-2">
                        <label htmlFor="custom-value" className="block text-sm font-medium text-gray-300">
                           Custom Value:
                        </label>
                        <input
                            id="custom-value"
                            type={isNumeric ? "number" : "text"}
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            className="w-full p-2 bg-zinc-700 border border-zinc-600 rounded-md shadow-sm focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] text-gray-200"
                            placeholder={isNumeric ? "e.g., 100" : "e.g., N/A"}
                            autoFocus
                        />
                     </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700/60">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-semibold text-gray-300 bg-transparent rounded-md hover:bg-zinc-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-zinc-900 bg-gradient-to-r from-[#39FF14] to-[#00C9A7] rounded-md hover:opacity-90 disabled:opacity-50"
                        disabled={strategy === 'fill_custom' && customValue.trim() === ''}
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Apply Fix
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MissingValueFixer;