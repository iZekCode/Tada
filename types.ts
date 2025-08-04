export enum MessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export type ChartType = 'bar' | 'pie' | 'line' | 'scatterplot' | 'treemap' | 'bubble' | 'boxplot';

export interface ChartData {
  chartType: ChartType;
  payload: any[]; // Made flexible to accommodate different chart types
  drillDownQueryHint?: string;
  xAxisLabel?: string; // For scatter plots
  yAxisLabel?: string; // For scatter plots
}

export interface ColumnProfile {
  column: string;
  type: 'numeric' | 'categorical';
  stats: Record<string, any>;
  missingPercentage: number;
  histogramData?: { name: string; value: number }[];
}

export interface DataQualityIssue {
    issue: string;
    column: string;
    details: string;
}

export interface DataProfile {
    columnProfiles: ColumnProfile[];
    dataQualityIssues: DataQualityIssue[];
    rowCount: number;
    columnCount: number;
}


export interface AnalysisResult {
  type: 'table' | 'chart' | 'value' | 'error' | 'profile' | 'code_confirmation' | 'statistics';
  title: string;
  summary?: string;
  data: any; // Can be DataRecord[], ChartData, string, error message, DataProfile, or code confirmation
  originalQuery?: string; // Added for retry functionality
  pythonCode?: string;
  sqlCode?: string;
  id?: string; // For messages that need to be identified, like confirmations
}

export interface Message {
  id: string;
  type: MessageType;
  content: string | AnalysisResult;
}

export type DataRecord = Record<string, any>;

export interface FileMetadata {
  columns: string[];
  rowCount: number;
  preview: DataRecord[];
  fileName: string;
}

export interface DataContext {
  dataDescription: string;
  columnDescriptions: Record<string, string>;
}

export interface DashboardWidget {
  id: string;
  content: AnalysisResult;
}
