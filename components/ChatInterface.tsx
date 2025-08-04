


import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Message, FileMetadata, DataRecord, ChartType } from '../types';
import MessageComponent from './Message';
import { SendIcon, LoaderIcon, SparklesIcon, ChevronUpIcon, ChevronDownIcon, ToolsIcon, BarChartIcon, PieChartIcon, LineChartIcon, ScatterChartIcon, TreemapIcon, BubbleChartIcon, BoxPlotIcon, TableIcon, HashIcon, FileTextIcon, ListChecksIcon } from './icons';
import TableRenderer from './TableRenderer';
import AIMessageSkeleton from './AIMessageSkeleton';


interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (query: string) => void;
  onAction: (action: string, data: any) => void;
  onDrillDown: (category: string, queryHint: string) => void;
  isLoading: boolean;
  metadata: FileMetadata;
  fullData: DataRecord[];
  suggestedQuestions: string[];
}

const requestTools = [
    { name: 'Table', icon: <TableIcon className="w-5 h-5" />, prompt: 'Show a table of...' },
    { name: 'Single Value', icon: <HashIcon className="w-5 h-5" />, prompt: 'What is the total value of...' },
    { name: 'Statistics', icon: <ListChecksIcon className="w-5 h-5" />, prompt: 'Show key statistics for the main columns.' },
    { name: 'Detailed Summary', icon: <FileTextIcon className="w-5 h-5" />, prompt: 'Provide a detailed summary of the dataset.' }
];

const chartTools: { name: string; type: ChartType; icon: React.ReactNode; prompt: string; }[] = [
    { name: 'Bar Chart', type: 'bar', icon: <BarChartIcon className="w-5 h-5" />, prompt: 'Generate a bar chart showing...' },
    { name: 'Pie Chart', type: 'pie', icon: <PieChartIcon className="w-5 h-5" />, prompt: 'Create a pie chart to see the distribution of...' },
    { name: 'Line Chart', type: 'line', icon: <LineChartIcon className="w-5 h-5" />, prompt: 'Show the trend of... over time with a line chart.' },
    { name: 'Scatter Plot', type: 'scatterplot', icon: <ScatterChartIcon className="w-5 h-5" />, prompt: 'Create a scatter plot to analyze the relationship between... and ...' },
    { name: 'Treemap', type: 'treemap', icon: <TreemapIcon className="w-5 h-5" />, prompt: 'Generate a treemap for...' },
    { name: 'Bubble Chart', type: 'bubble', icon: <BubbleChartIcon className="w-5 h-5" />, prompt: 'Generate a bubble chart for... by ... and ...' },
    { name: 'Box Plot', type: 'boxplot', icon: <BoxPlotIcon className="w-5 h-5" />, prompt: 'Show the distribution of... using a box plot.' },
];


const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, onAction, onDrillDown, isLoading, metadata, fullData, suggestedQuestions }) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
            setIsToolsMenuOpen(false);
        }
    };
    if (isToolsMenuOpen) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isToolsMenuOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleSuggestionClick = (question: string) => {
      onSendMessage(question);
  };
  
  const handleToolClick = (prompt: string) => {
    setInput(prompt);
    setIsToolsMenuOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-y-auto chat-container p-6 space-y-6">
        <details className="bg-zinc-800/50 rounded-lg p-3 cursor-pointer border border-zinc-700">
            <summary className="font-semibold text-gray-200 text-sm">View Full Data ({metadata.rowCount.toLocaleString()} rows)</summary>
            <div className="mt-4">
                <TableRenderer data={fullData} />
            </div>
        </details>
        {messages.map((msg) => (
          <MessageComponent 
            key={msg.id} 
            message={msg}
            onAction={onAction}
            onDrillDown={onDrillDown}
           />
        ))}
        {isLoading && (messages.length === 0 || messages[messages.length - 1]?.type === 'user') && (
            <AIMessageSkeleton />
        )}
        <div ref={chatEndRef} />
      </div>

      <footer className="p-4 border-t border-zinc-700 bg-zinc-900/80">
        {suggestedQuestions.length > 0 && (
            <div className="mb-3 p-3 bg-[#39FF14]/5 rounded-lg border border-[#39FF14]/20">
                 <div className={`flex items-center justify-between ${showSuggestions ? 'mb-2' : ''}`}>
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-[#39FF14]" />
                        <h4 className="text-sm font-semibold text-[#39FF14]">Suggested for you</h4>
                    </div>
                    <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className="p-1 rounded-full text-[#39FF14] hover:bg-[#39FF14]/20 transition-colors"
                        aria-label={showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
                    >
                        {showSuggestions ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    </button>
                </div>
                {showSuggestions && (
                    <div className="flex flex-col items-start gap-2">
                        {suggestedQuestions.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => handleSuggestionClick(q)}
                                disabled={isLoading}
                                className="px-3 py-1.5 text-sm font-medium text-left text-[#c0ffc5] bg-[#39FF14]/10 rounded-full hover:bg-[#39FF14]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}
        <div className="flex items-center gap-2">
            <div className="relative">
                <button
                    onClick={() => setIsToolsMenuOpen(prev => !prev)}
                    className={`p-2 rounded-full transition-colors ${isToolsMenuOpen ? 'bg-zinc-600 text-gray-100' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'}`}
                    aria-label="Open tools menu"
                    aria-haspopup="true"
                    aria-expanded={isToolsMenuOpen}
                >
                    <ToolsIcon className="w-5 h-5" />
                </button>
                {isToolsMenuOpen && (
                    <div ref={toolsMenuRef} className="absolute bottom-14 left-0 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-2 z-20">
                        <p className="text-xs text-zinc-500 font-semibold uppercase px-2 py-1">REQUEST TYPE</p>
                        <div className="grid grid-cols-1 gap-1 mb-2">
                            {requestTools.map(tool => (
                                <button
                                    key={tool.name}
                                    onClick={() => handleToolClick(tool.prompt)}
                                    disabled={isLoading}
                                    className="w-full flex items-center gap-3 text-left p-2 rounded-md text-gray-300 hover:bg-zinc-700/70 transition-colors disabled:opacity-50"
                                >
                                    <span className="text-gray-400">{tool.icon}</span>
                                    <span className="text-sm font-medium">{tool.name}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-500 font-semibold uppercase px-2 py-1 border-t border-zinc-700/50 pt-2">CHARTS</p>
                        <div className="grid grid-cols-1 gap-1">
                            {chartTools.map(tool => (
                                <button
                                    key={tool.type}
                                    onClick={() => handleToolClick(tool.prompt)}
                                    disabled={isLoading}
                                    className="w-full flex items-center gap-3 text-left p-2 rounded-md text-gray-300 hover:bg-zinc-700/70 transition-colors disabled:opacity-50"
                                >
                                    <span className="text-gray-400">{tool.icon}</span>
                                    <span className="text-sm font-medium">{tool.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleSubmit} className="relative flex-1">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about your data..."
                    className="w-full bg-zinc-800 border-zinc-700 rounded-lg py-3 pl-4 pr-12 focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition duration-200 text-gray-200 placeholder-gray-500"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-zinc-900 bg-gradient-to-r from-[#39FF14] to-[#00C9A7] hover:opacity-90 disabled:from-zinc-600 disabled:to-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading && !suggestedQuestions.length ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <SendIcon className="w-5 h-5" />}
                </button>
            </form>
        </div>
      </footer>
    </div>
  );
};

export default ChatInterface;