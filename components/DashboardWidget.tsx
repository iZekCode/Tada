import React, { useState, useRef, useEffect } from 'react';
import type { DashboardWidget } from '../types';
import ChartRenderer from './ChartRenderer';
import TableRenderer from './TableRenderer';
import MarkdownRenderer from './MarkdownRenderer';
import { TrashIcon, PencilIcon } from './icons';

interface DashboardWidgetProps {
  widget: DashboardWidget;
  onAction: (action: string, data: any) => void;
}

const DashboardWidgetComponent: React.FC<DashboardWidgetProps> = ({ widget, onAction }) => {
    const { id, content } = widget;
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(content.title);
    const inputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleTitleUpdate = () => {
        setIsEditing(false);
        if (title.trim() && title !== content.title) {
            onAction('update_widget', { id, content: { title } });
        } else {
            setTitle(content.title); // Reset if empty or unchanged
        }
    };
    
    const renderContent = () => {
        switch (content.type) {
            case 'chart': return <ChartRenderer data={content.data} isDashboardWidget={true} />;
            case 'table': return <TableRenderer data={content.data} isDashboardWidget={true} />;
            case 'value':
                return (
                    <div className="p-4 h-full flex items-center justify-center">
                        <p className="text-3xl font-bold text-gray-100">{content.data}</p>
                    </div>
                );
            case 'statistics':
                 return (
                    <div className="p-4 space-y-2 overflow-y-auto">
                        {(content.data.payload as { statistic: string; value: string | number }[]).map((item, index) => (
                            <div key={index} className="flex justify-between items-center text-sm py-1 border-b border-zinc-700/50 last:border-b-0">
                                <span className="text-gray-400">{item.statistic}</span>
                                <span className="font-semibold text-gray-100 text-right">{String(item.value)}</span>
                            </div>
                        ))}
                    </div>
                );
            default:
                return <p className="p-4 text-gray-500">Unsupported widget type.</p>;
        }
    };

    return (
        <div className="group w-full h-full flex flex-col rounded-lg overflow-hidden">
            <header className="drag-handle p-3 border-b border-zinc-700 bg-zinc-800 cursor-move flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2 flex-grow min-w-0">
                    {isEditing ? (
                         <input
                            ref={inputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleTitleUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleUpdate()}
                            className="no-drag w-full bg-zinc-900 border border-zinc-600 rounded-md px-2 py-1 text-sm text-gray-100 focus:ring-1 focus:ring-[#39FF14]"
                         />
                    ) : (
                        <h4
                            onClick={() => setIsEditing(true)}
                            className="no-drag font-semibold text-sm text-gray-200 truncate cursor-pointer"
                            title={title}
                        >
                            {title}
                        </h4>
                    )}
                    <button onClick={() => setIsEditing(true)} className="no-drag text-zinc-500 hover:text-zinc-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><PencilIcon className="w-3 h-3"/></button>
                </div>
                <button
                    onClick={() => onAction('delete_widget', { id })}
                    className="no-drag ml-2 p-1.5 rounded-md text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    aria-label="Delete widget"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </header>
            <div className="flex-grow p-2 overflow-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default DashboardWidgetComponent;