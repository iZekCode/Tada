import React from 'react';
import type { Message, AnalysisResult } from '../types';
import { MessageType } from '../types';
import { BotIcon, UserIcon, ListChecksIcon } from './icons';
import ResultRenderer from './ResultRenderer';

interface MessageProps {
  message: Message;
  onAction: (action: string, data: any) => void;
  onDrillDown: (category: string, queryHint: string) => void;
}

const MessageComponent: React.FC<MessageProps> = ({ message, onAction, onDrillDown }) => {
  const isUser = message.type === MessageType.USER;
  const isSystem = message.type === MessageType.SYSTEM;
  const isAI = message.type === MessageType.AI;

  const analysisResult = isAI ? (message.content as AnalysisResult) : null;
  const isProfileReport = analysisResult?.type === 'profile';

  const isComplexContent = isAI && 
    typeof message.content === 'object' && 
    (
        message.content.type === 'table' || 
        message.content.type === 'chart' || 
        message.content.type === 'statistics' ||
        isProfileReport
    );

  const wrapperClasses = `flex items-start gap-3 w-full ${isUser ? 'justify-end' : ''}`;
  
  const bubbleClasses = `rounded-xl p-4 min-w-0 ${
    isUser
      ? 'bg-gradient-to-r from-[#39FF14] to-[#00C9A7] text-zinc-900 font-medium max-w-xl'
      : `bg-zinc-800/80 backdrop-blur-sm text-gray-200 border border-zinc-700 ${isComplexContent ? 'max-w-6xl w-full' : 'max-w-xl'}`
  }`;
  
  const Icon = isUser ? UserIcon : (isProfileReport ? ListChecksIcon : BotIcon);

  if (isSystem) {
    return (
      <div className="text-center text-sm text-gray-500 py-4">
        {message.content as string}
      </div>
    );
  }

  return (
    <div className={wrapperClasses}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isProfileReport ? 'bg-[#39FF14]/20' : 'bg-zinc-700'}`}>
          <Icon className={`w-5 h-5 ${isProfileReport ? 'text-[#39FF14]' : 'text-gray-300'}`} />
        </div>
      )}
      <div className={bubbleClasses}>
        {isAI ? (
          <ResultRenderer
            result={message.content as AnalysisResult}
            onAction={onAction}
            onDrillDown={onDrillDown}
          />
        ) : (
          <p className="whitespace-pre-wrap">{message.content as string}</p>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#39FF14]/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#39FF14]" />
        </div>
      )}
    </div>
  );
};

export default MessageComponent;