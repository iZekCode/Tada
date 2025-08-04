import React from 'react';
import { BotIcon } from './icons';

const AIMessageSkeleton: React.FC = () => (
    <div className="flex items-start gap-3 w-full">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-gray-400" />
      </div>
      <div className="max-w-4xl w-full rounded-xl p-4 bg-zinc-800 border border-zinc-700">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-700 rounded w-1/3"></div>
          <div className="h-40 bg-zinc-700 rounded w-full"></div>
          <div className="flex items-center gap-2 pt-2">
            <div className="h-6 bg-zinc-700 rounded w-24"></div>
            <div className="h-6 bg-zinc-700 rounded w-24"></div>
          </div>
        </div>
      </div>
    </div>
);

export default AIMessageSkeleton;