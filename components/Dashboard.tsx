import React, { useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import type { Layouts } from 'react-grid-layout';
import type { DashboardWidget } from '../types';
import DashboardWidgetComponent from './DashboardWidget';
import { DownloadIcon } from './icons';

const ReactGridLayout = WidthProvider(Responsive);

interface DashboardProps {
  widgets: DashboardWidget[];
  layouts: Layouts;
  onLayoutChange: (layouts: Layouts) => void;
  onAction: (action: string, data: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ widgets, layouts, onLayoutChange, onAction }) => {
  const gridRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'png' | 'pdf') => {
    if (!gridRef.current) return;

    try {
        // Find the grid layout instance inside the ref to screenshot only the content
        const gridElement = gridRef.current.querySelector('.react-grid-layout') as HTMLElement;
        const targetElement = gridElement || gridRef.current;
        
        const dataUrl = await toPng(targetElement, { 
            quality: 1, 
            pixelRatio: 2, 
            backgroundColor: '#18181b' 
        });

        if (format === 'png') {
            const link = document.createElement('a');
            link.download = 'dashboard.png';
            link.href = dataUrl;
            link.click();
        } else {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const pdf = new jsPDF({
                    orientation: img.width > img.height ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [img.width, img.height]
                });
                pdf.addImage(img, 'PNG', 0, 0, img.width, img.height);
                pdf.save('dashboard.pdf');
            };
        }
    } catch (error) {
        console.error('Failed to export dashboard:', error);
    }
  };

  return (
    <div className="h-full w-full bg-zinc-900 relative">
      <header className="p-4 border-b border-zinc-700/60 bg-zinc-900/80 flex justify-between items-center h-[57px] flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-200">Dashboard</h3>
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleExport('png')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#c0ffc5] bg-[#39FF14]/10 rounded-md hover:bg-[#39FF14]/20 transition-colors"
                disabled={widgets.length === 0}
            >
                <DownloadIcon className="w-3.5 h-3.5" />
                Export as PNG
            </button>
            <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#c0ffc5] bg-[#39FF14]/10 rounded-md hover:bg-[#39FF14]/20 transition-colors"
                disabled={widgets.length === 0}
            >
                <DownloadIcon className="w-3.5 h-3.5" />
                Export as PDF
            </button>
        </div>
      </header>
      <div ref={gridRef} className="absolute inset-x-0 bottom-0 top-[57px] overflow-y-auto p-4 bg-zinc-900/50">
        {widgets.length === 0 ? (
             <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500">
                <p className="text-lg font-semibold">Your dashboard is empty.</p>
                <p>Pin insights from the Chat view to add them here.</p>
            </div>
        ) : (
            <ReactGridLayout
                layouts={layouts}
                onLayoutChange={(layout, allLayouts) => onLayoutChange(allLayouts)}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={50}
                draggableHandle=".drag-handle"
                draggableCancel=".no-drag"
                className="layout"
            >
                {widgets.map((widget) => (
                <div key={widget.id} className="bg-zinc-800/80 rounded-lg shadow-lg border border-zinc-700">
                    <DashboardWidgetComponent widget={widget} onAction={onAction} />
                </div>
                ))}
            </ReactGridLayout>
        )}
      </div>
    </div>
  );
};

export default Dashboard;