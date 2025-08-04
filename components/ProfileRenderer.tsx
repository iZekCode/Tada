import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { DataProfile, ColumnProfile, DataQualityIssue } from '../types';
import { SparklesIcon } from './icons';

interface ColumnProfileCardProps {
    profile: ColumnProfile;
}

const ColumnProfileCard: React.FC<ColumnProfileCardProps> = ({ profile }) => {
    const renderStats = () => {
        if (profile.type === 'numeric') {
            const stats = profile.stats as { min: number; max: number; mean: number; median: number, std: number };
            return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-gray-400">
                    <span>Mean</span><span className="font-medium text-gray-200 text-right">{stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span>Median</span><span className="font-medium text-gray-200 text-right">{stats.median.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span>Std. Dev.</span><span className="font-medium text-gray-200 text-right">{stats.std.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span>Min</span><span className="font-medium text-gray-200 text-right">{stats.min.toLocaleString()}</span>
                    <span>Max</span><span className="font-medium text-gray-200 text-right">{stats.max.toLocaleString()}</span>
                </div>
            );
        } else { // categorical
            const stats = profile.stats as { uniqueCount: number; topValues: {name: string, value: number}[] };
            return (
                 <div className="text-sm text-gray-400 space-y-2">
                    <div className="flex justify-between">
                        <span>Unique Values</span>
                        <span className="font-medium text-gray-200">{stats.uniqueCount}</span>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-300">Top Values:</span>
                        <ul className="space-y-1 mt-1">
                            {stats.topValues.map(item => (
                                <li key={item.name} className="truncate text-gray-500">
                                   - {item.name}: {item.value.toLocaleString()}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            );
        }
    };
    
    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col">
            <h4 className="font-semibold text-gray-100 truncate">{profile.column}</h4>
            <p className="text-xs text-gray-500 mb-3 capitalize">{profile.type}</p>
            
            {profile.type === 'numeric' && profile.histogramData && profile.histogramData.length > 0 && (
                <div className="w-full h-24 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profile.histogramData} margin={{ top: 5, right: 0, left: 0, bottom: -5 }}>
                            <Tooltip cursor={{ fill: 'rgba(161, 161, 170, 0.1)' }} contentStyle={{ fontSize: '10px', padding: '2px 8px', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.25rem' }} />
                            <XAxis dataKey="name" fontSize={10} tick={false} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} hide={true} />
                            <Bar dataKey="value" fill="#39FF14" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            
            {renderStats()}

            {profile.missingPercentage > 0 && (
                <div className="mt-4 pt-2 border-t border-zinc-700 text-sm text-amber-400">
                    {profile.missingPercentage}% missing values
                </div>
            )}
        </div>
    );
};

interface ProfileRendererProps {
    data: DataProfile;
    onAction: (action: string, data: any) => void;
}

const ProfileRenderer: React.FC<ProfileRendererProps> = ({ data, onAction }) => {
    if (!data) {
        return <p className="text-gray-500">No profile data to display.</p>;
    }
    const { columnProfiles, dataQualityIssues } = data;

    return (
        <div className="space-y-4">
             {dataQualityIssues.length > 0 && (
                <div className="bg-amber-900/30 border border-amber-800/40 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-amber-200 mb-2">Data Quality Alerts</h4>
                    <ul className="list-none space-y-3 text-sm text-amber-300">
                        {dataQualityIssues.map((issue, index) => {
                            const issueProfile = columnProfiles.find(p => p.column === issue.column);
                            const isMissingValueIssue = issue.issue === 'Missing Values' && issueProfile;

                            return (
                                <li key={index} className="flex flex-col items-start gap-2 p-2 bg-amber-500/5 rounded-md">
                                    <div>
                                        <span className="font-semibold">{issue.column}:</span> {issue.details}
                                    </div>
                                    <button
                                      onClick={() => onAction(
                                          isMissingValueIssue ? 'show_missing_value_fix_options' : 'suggest_fix',
                                          { issue, profile: issueProfile }
                                      )}
                                      className="flex items-center gap-1.5 px-2 py-1 text-sm font-semibold text-zinc-900 bg-gradient-to-r from-[#39FF14] to-[#00C9A7] rounded-md hover:opacity-90 transition-colors"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        {isMissingValueIssue ? 'Fix Missing Values' : 'Suggest Fix'}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {columnProfiles.map(profile => (
                    <ColumnProfileCard key={profile.column} profile={profile} />
                ))}
            </div>
        </div>
    );
};

export default ProfileRenderer;