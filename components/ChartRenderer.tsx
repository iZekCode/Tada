


import React, { useRef, useState, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Treemap } from 'recharts';
import { toPng } from 'html-to-image';
import type { ChartData, AnalysisResult } from '../types';
import { CopyIcon, CheckIcon, PinIcon } from './icons';

interface ChartRendererProps {
  data: ChartData;
  onDrillDown?: (category: string, queryHint: string) => void;
  onAction?: (action: string, data: any) => void;
  result?: AnalysisResult;
  isDashboardWidget?: boolean;
}

const COLORS = ['#39FF14', '#2de65f', '#21ce8f', '#15b6b0', '#089fc0', '#0088c3', '#00C9A7'];

const formatAxisTick = (tick: any): string => {
    if (typeof tick !== 'number') return String(tick);
    if (Math.abs(tick) >= 1_000_000) {
        return (tick / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (Math.abs(tick) >= 1_000) {
        return (tick / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return tick.toLocaleString();
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const chartType = payload[0]?.payload?.chartType; // Pass this in if needed
    
    const containerClasses = "bg-zinc-900/90 p-2 border border-zinc-700 rounded-lg shadow-lg backdrop-blur-sm text-base";

    // Bubble chart
    if (data.z !== undefined) {
         return (
             <div className={containerClasses}>
                <p className="font-semibold text-gray-200">{data.name}</p>
                <p className="text-gray-300 capitalize"><span className="font-semibold">x:</span> {data.x.toLocaleString()}</p>
                <p className="text-gray-300 capitalize"><span className="font-semibold">y:</span> {data.y.toLocaleString()}</p>
                <p className="text-gray-300 capitalize"><span className="font-semibold">size:</span> {data.z.toLocaleString()}</p>
             </div>
        );
    }
    // Box plot
    if (data.q1 !== undefined) {
      return (
        <div className={containerClasses}>
          <p className="font-semibold text-gray-200 text-base">{data.category}</p>
          <ul className="text-sm text-gray-400 mt-1">
              <li>Max: <span className="font-medium text-gray-300">{data.max.toLocaleString()}</span></li>
              <li>Q3: <span className="font-medium text-gray-300">{data.q3.toLocaleString()}</span></li>
              <li>Median: <span className="font-medium text-gray-300">{data.median.toLocaleString()}</span></li>
              <li>Q1: <span className="font-medium text-gray-300">{data.q1.toLocaleString()}</span></li>
              <li>Min: <span className="font-medium text-gray-300">{data.min.toLocaleString()}</span></li>
          </ul>
        </div>
      );
    }
    // Treemap
    if (data.size !== undefined) {
       return (
         <div className={containerClasses}>
          <p className="font-semibold text-gray-200 text-base">{data.name}</p>
          <p className="text-gray-400 text-sm">
            Size: <span className="font-medium ml-1 text-gray-300">{data.size.toLocaleString()}</span>
          </p>
        </div>
       );
    }
    // Scatter plot
    if (payload.length > 1 && payload[0].dataKey === 'x' && payload[1].dataKey === 'y') {
        const xData = payload[0];
        const yData = payload[1];
        return (
             <div className={containerClasses}>
                <p className="text-gray-300 capitalize"><span className="font-semibold">{xData.name || 'x'}:</span> {xData.value.toLocaleString()}</p>
                <p className="text-gray-300 capitalize"><span className="font-semibold">{yData.name || 'y'}:</span> {yData.value.toLocaleString()}</p>
             </div>
        );
    }
    // Bar, Line, Pie
    return (
      <div className={containerClasses}>
        <p className="font-semibold text-gray-200 text-base">{label || payload[0].name}</p>
        <p className="text-gray-400 text-sm">
          <span style={{ color: payload[0].color || payload[0].payload.fill }}>
            {payload[0].name}:
          </span>
          <span className="font-medium ml-1 text-gray-300">{payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Custom shape for Box Plot bars
const BoxPlotShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { min, q1, median, q3, max, outliers = [] } = payload;
    const range = max - min;

    // This case can happen if min === max
    if (range === 0 && height === 0) {
        // Draw just the median line if all values are the same
        const medianY = y;
        return (
             <g>
                <line x1={x} y1={medianY} x2={x+width} y2={medianY} stroke="white" strokeWidth={2} />
             </g>
        )
    }
    
    // Function to scale a data value to a Y-coordinate
    const toY = (value: number) => y + ((max - value) / range) * height;

    const q1Y = toY(q1);
    const q3Y = toY(q3);
    const medianY = toY(median);
    const minY = toY(min); // This should be y + height
    const maxY = toY(max); // This should be y

    const boxWidth = width * 0.8;
    const boxX = x + width * 0.1;

    return (
        <g>
            {/* Whiskers */}
            <line x1={x + width / 2} y1={maxY} x2={x + width / 2} y2={q3Y} stroke="#a1a1aa" strokeWidth={1} />
            <line x1={x + width / 2} y1={q1Y} x2={x + width / 2} y2={minY} stroke="#a1a1aa" strokeWidth={1} />

            {/* Top and bottom of whiskers */}
            <line x1={boxX} y1={maxY} x2={boxX + boxWidth} y2={maxY} stroke="#a1a1aa" strokeWidth={1} />
            <line x1={boxX} y1={minY} x2={boxX + boxWidth} y2={minY} stroke="#a1a1aa" strokeWidth={1} />

            {/* Box */}
            <rect x={boxX} y={q3Y} width={boxWidth} height={q1Y - q3Y} fill={COLORS[0]} opacity="0.8" />

            {/* Median line */}
            <line x1={boxX} y1={medianY} x2={boxX + boxWidth} y2={medianY} stroke="white" strokeWidth={2} />

            {/* Outliers */}
            {outliers.map((outlier: number, index: number) => (
                <circle key={index} cx={x + width / 2} cy={toY(outlier)} r={3} fill="#ff4d4d" />
            ))}
        </g>
    );
};

// Custom content renderer for Treemap to get colors
const CustomizedTreemapContent = (props: any) => {
    const { root, depth, x, y, width, height, index, colors, name, size } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: colors[index % colors.length],
                    stroke: '#18181b',
                    strokeWidth: 2,
                }}
            />
             {width > 80 && height > 20 && (
                <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14}>
                    {name}
                </text>
            )}
        </g>
    );
};


const ChartRenderer: React.FC<ChartRendererProps> = ({ data, onDrillDown, onAction, result, isDashboardWidget = false }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  if (!data) {
    return <p className="text-gray-500">No chart data to display.</p>;
  }
  const { payload } = data;

  if (!payload || payload.length === 0) {
    return <p className="text-gray-500">No data available for charting.</p>;
  }
  
  const handleCopy = useCallback(() => {
    if (chartContainerRef.current === null) {
      return;
    }

    toPng(chartContainerRef.current, { cacheBust: true, backgroundColor: '#27272a' })
      .then((dataUrl) => {
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]).then(() => {
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
              console.error('Failed to copy image to clipboard:', err);
            });
          });
      })
      .catch((err) => {
        console.error('Failed to generate chart image', err);
      });
  }, []);
  
  const handlePin = () => {
    if (onAction && result) {
      onAction('pin_to_dashboard', { result });
      setPinSuccess(true);
      setTimeout(() => setPinSuccess(false), 2000);
    }
  };

  const ChartComponent = ({ width, height }: { width?: number; height?: number }) => {
    if (!width || !height) {
      return null;
    }

    const { chartType, payload, drillDownQueryHint, xAxisLabel, yAxisLabel } = data;
    
    const handleDrillDownClick = (chartElementData: any) => {
      if (onDrillDown && drillDownQueryHint && chartElementData && chartElementData.name) {
        onDrillDown(chartElementData.name, drillDownQueryHint);
      }
    };
    
    switch (chartType) {
      case 'boxplot':
        return (
          <BarChart
            width={width}
            height={height}
            data={payload}
            margin={{ top: 20, right: 30, bottom: 80, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="category" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" />
            <YAxis stroke="#a1a1aa" fontSize={14} tickLine={false} axisLine={false} tickFormatter={formatAxisTick} domain={['dataMin', 'dataMax']} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(161, 161, 170, 0.1)' }} />
            <Bar
              dataKey={(d) => [d.min, d.max]}
              shape={<BoxPlotShape />}
            />
          </BarChart>
        );
      case 'bubble':
        return (
          <ScatterChart
            width={width}
            height={height}
            margin={{ top: 20, right: 30, bottom: 60, left: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={xAxisLabel} 
              stroke="#a1a1aa" 
              fontSize={14} 
              tickLine={false} 
              axisLine={false}
              label={{ value: xAxisLabel, position: 'bottom', dy: 30, fill: '#a1a1aa', fontSize: 14 }}
              tickFormatter={formatAxisTick}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={yAxisLabel} 
              stroke="#a1a1aa" 
              fontSize={14} 
              tickLine={false} 
              axisLine={false}
              label={{ value: yAxisLabel, angle: -90, position: 'left', dx: -25, fill: '#a1a1aa', fontSize: 14 }}
              tickFormatter={formatAxisTick}
            />
            <ZAxis type="number" dataKey="z" range={[100, 1000]} name="size" />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Data points" data={payload} fill={COLORS[0]} shape="circle" opacity={0.7} />
          </ScatterChart>
        );
      case 'treemap':
        return (
          <Treemap
            width={width}
            height={height}
            data={payload}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#fff"
            fill="#8884d8"
            content={<CustomizedTreemapContent colors={COLORS} />}
            isAnimationActive={true}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        );
      case 'scatterplot':
        return (
          <ScatterChart
            width={width}
            height={height}
            margin={{ top: 20, right: 30, bottom: 60, left: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={xAxisLabel} 
              stroke="#a1a1aa" 
              fontSize={14} 
              tickLine={false} 
              axisLine={false}
              label={{ value: xAxisLabel, position: 'bottom', dy: 30, fill: '#a1a1aa', fontSize: 14 }}
              tickFormatter={formatAxisTick}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={yAxisLabel} 
              stroke="#a1a1aa" 
              fontSize={14} 
              tickLine={false} 
              axisLine={false}
              label={{ value: yAxisLabel, angle: -90, position: 'left', dx: -25, fill: '#a1a1aa', fontSize: 14 }}
              tickFormatter={formatAxisTick}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Data points" data={payload} fill={COLORS[0]} />
          </ScatterChart>
        );
      case 'pie':
        return (
          <PieChart width={width} height={height}>
            <Pie
              data={payload}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="80%"
              fill="#8884d8"
              onClick={handleDrillDownClick}
              cursor={onDrillDown && drillDownQueryHint ? "pointer" : "default"}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (percent === 0) return null;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                return (
                  <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="14px" fontWeight="bold">
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
            >
              {payload.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{fontSize: "14px", color: '#a1a1aa'}} />
          </PieChart>
        );
      case 'line':
        return (
           <LineChart
              width={width}
              height={height}
              data={payload}
              margin={{ top: 30, right: 20, left: 0, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis 
                dataKey="name" 
                stroke="#a1a1aa" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                interval={0}
                angle={-45}
                textAnchor="end"
              />
              <YAxis stroke="#a1a1aa" fontSize={14} tickLine={false} axisLine={false} tickFormatter={formatAxisTick} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{fontSize: "12px", color: '#a1a1aa'}}/>
              <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4, fill: COLORS[0] }} activeDot={{ r: 6, stroke: COLORS[0] }} />
            </LineChart>
        );
      case 'bar':
      default:
        return (
          <BarChart
            width={width}
            height={height}
            data={payload}
            margin={{ top: 30, right: 20, left: 0, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis 
                dataKey="name" 
                stroke="#a1a1aa" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                interval={0}
                angle={-45}
                textAnchor="end"
              />
            <YAxis stroke="#a1a1aa" fontSize={14} tickLine={false} axisLine={false} tickFormatter={formatAxisTick}/>
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(161, 161, 170, 0.1)' }} />
            <Legend verticalAlign="top" align="right" wrapperStyle={{fontSize: "12px", color: '#a1a1aa'}}/>
            <Bar 
              dataKey="value" 
              fill={COLORS[0]} 
              radius={[4, 4, 0, 0]}
              onClick={handleDrillDownClick}
              cursor={onDrillDown && drillDownQueryHint ? "pointer" : "default"}
            />
          </BarChart>
        );
    }
  };
  
  const containerClasses = isDashboardWidget
    ? "group relative w-full h-full"
    : "group relative w-full h-80 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 backdrop-blur-sm";

  return (
    <div ref={chartContainerRef} className={containerClasses}>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {onAction && result && !isDashboardWidget && (
            <button
                onClick={handlePin}
                disabled={pinSuccess}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                    pinSuccess
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-700/50 text-gray-300 hover:bg-zinc-600/50'
                }`}
                aria-label="Pin to dashboard"
            >
                <PinIcon className="w-3.5 h-3.5" />
                {pinSuccess ? 'Pinned' : 'Pin'}
            </button>
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-300 bg-zinc-700/50 rounded-md hover:bg-zinc-600/50 transition-all"
          aria-label="Copy chart as image"
        >
          {isCopied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-[#39FF14]" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                Copy
              </>
          )}
        </button>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent />
      </ResponsiveContainer>
    </div>
  );
};

export default ChartRenderer;