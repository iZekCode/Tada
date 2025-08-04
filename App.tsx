






import React, { useState, useCallback } from 'react';
import type { Layout, Layouts } from 'react-grid-layout';
import type { DataRecord, FileMetadata, Message, DataContext, AnalysisResult, DataQualityIssue, ColumnProfile, DashboardWidget } from './types';
import { MessageType } from './types';
import { getAnalysisCodes, generateSuggestedQuestions, classifyColumnTypes, generateCleaningCode } from './services/geminiService';
import { executeAnalysisCode, executeCleaningCode } from './services/executionService';
import { profileData } from './services/profilingService';
import FileUpload from './components/FileUpload';
import DataContextForm from './components/DataContextForm';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import MissingValueFixer from './components/MissingValueFixer';
import { ChatBubbleIcon, DashboardIcon } from './components/icons';


type AppState = 'UPLOADING' | 'CONTEXT_INPUT' | 'VIEWING';
type ActiveView = 'CHAT' | 'DASHBOARD';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('UPLOADING');
  const [activeView, setActiveView] = useState<ActiveView>('CHAT');

  const [fileData, setFileData] = useState<DataRecord[] | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [dataContext, setDataContext] = useState<DataContext | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);
  const [layouts, setLayouts] = useState<Layouts>({ lg: [] });

  const [missingValueFixConfig, setMissingValueFixConfig] = useState<{ issue: DataQualityIssue; profile: ColumnProfile } | null>(null);


  const handleDataLoaded = useCallback((data: DataRecord[], metadata: FileMetadata) => {
    setFileData(data);
    setFileMetadata(metadata);
    setAppState('CONTEXT_INPUT');
  }, []);

  const runInitialProfile = async (data: DataRecord[], metadata: FileMetadata, context: DataContext) => {
      try {
          const classifications = await classifyColumnTypes(metadata, metadata.preview, context);
          const profileResult = profileData(data, classifications);
          
          let newMessages = messages.filter(m => m.id !== 'system-profiling');

          if (profileResult) {
              const profileMessage: Message = {
                  id: `ai-profile-${Date.now()}`,
                  type: MessageType.AI,
                  content: {
                      type: 'profile',
                      title: 'Data Profile',
                      data: profileResult
                  }
              };
              newMessages.push(profileMessage);
          } else {
               newMessages.push({ id: 'system-error-profile', type: MessageType.SYSTEM, content: "Could not generate a data profile." });
          }
          
          const readyMessage: Message = {
              id: `ai-ready-${Date.now()}`,
              type: MessageType.AI,
              content: {
                type: 'value',
                title: '',
                summary: "I'm ready to analyze your data. What would you like to know?",
                data: null,
              }
          };
          newMessages.push(readyMessage);

          setMessages(newMessages);

          const suggestions = await generateSuggestedQuestions(metadata, context, newMessages);
          setSuggestedQuestions(suggestions);

      } catch (error) {
          console.error("Error during initial data processing:", error);
          const errorMessage: Message = {
              id: `error-profile-${Date.now()}`,
              type: MessageType.AI,
              content: {
                  type: 'error',
                  title: 'Initial Analysis Failed',
                  data: 'Something went wrong while profiling the data. Please try asking a question directly.',
              },
          };
          const finalErrorMessages = messages.filter(m => m.id !== 'system-profiling').concat(errorMessage);
          setMessages(finalErrorMessages);
          const suggestions = await generateSuggestedQuestions(metadata, context, finalErrorMessages);
          setSuggestedQuestions(suggestions);
      }
  };

  const handleContextProvided = useCallback(async (context: DataContext) => {
    setDataContext(context);
    setAppState('VIEWING');
    setIsLoading(true);
    
    const profilingMessage: Message = {
        id: 'system-profiling',
        type: MessageType.SYSTEM,
        content: "Analyzing data structure and generating initial profile...",
    };
    setMessages([profilingMessage]);

    if (fileData && fileMetadata) {
        await runInitialProfile(fileData, fileMetadata, context);
    } else {
        const readyMessage: Message = {
            id: `ai-ready-${Date.now()}`,
            type: MessageType.AI,
            content: {
              type: 'value',
              title: '',
              summary: "I'm ready to analyze your data. What would you like to know?",
              data: null,
            }
        };
        setMessages([readyMessage]);
    }
    setIsLoading(false);
  }, [fileData, fileMetadata]);

  const handleSendMessage = useCallback(async (query: string) => {
    if (!fileData || !fileMetadata || isLoading) return;

    setSuggestedQuestions([]);
    setIsLoading(true);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: MessageType.USER,
      content: query,
    };
    const messagesWithUserQuery = [...messages, userMessage];
    setMessages(messagesWithUserQuery);
    
    let result: AnalysisResult;
    try {
      const { javascriptCode, pythonCode, sqlCode } = await getAnalysisCodes(query, fileMetadata, dataContext, messagesWithUserQuery);
      result = await executeAnalysisCode(javascriptCode, fileData);
      result.pythonCode = pythonCode;
      result.sqlCode = sqlCode;
    } catch (error) {
      console.error("Error in analysis pipeline:", error);
      result = {
          type: 'error',
          title: 'Analysis Failed',
          data: `Sorry, I couldn't process your request. Reason: ${error instanceof Error ? error.message : "An unknown error occurred."}`,
          originalQuery: query,
      };
    }
    
    const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: MessageType.AI,
        content: result,
    };
    
    const finalMessages = [...messagesWithUserQuery, aiMessage];
    setMessages(finalMessages);
    setIsLoading(false);

    try {
        const newSuggestions = await generateSuggestedQuestions(fileMetadata, dataContext, finalMessages);
        setSuggestedQuestions(newSuggestions);
    } catch (e) {
        console.error("Failed to fetch new suggestions:", e);
    }

  }, [fileData, fileMetadata, dataContext, isLoading, messages]);
  
  const handleSuggestFix = async (issue: DataQualityIssue) => {
    if (!fileData || !fileMetadata || isLoading) return;
    setIsLoading(true);
    try {
        const cleaningCode = await generateCleaningCode(issue, fileMetadata, dataContext);
        const confirmationMessage: Message = {
            id: `confirm-${Date.now()}`,
            type: MessageType.AI,
            content: {
                type: 'code_confirmation',
                title: `Suggested Fix for: ${issue.issue}`,
                summary: `The AI suggests the following code to fix the issue in the '${issue.column}' column. Do you want to apply this change?`,
                data: { code: cleaningCode },
                id: `confirm-${Date.now()}`,
            }
        };
        setMessages(prev => [...prev, confirmationMessage]);
    } catch (error) {
        const errorMessage: Message = {
            id: `error-${Date.now()}`,
            type: MessageType.AI,
            content: { type: 'error', title: 'Could Not Generate Fix', data: error instanceof Error ? error.message : "An unknown error occurred." },
        };
        setMessages(prev => [...prev, errorMessage]);
    }
    setIsLoading(false);
  };

  const handleApplyFix = async (code: string) => {
      if (!fileData || !fileMetadata || isLoading) return;
      setIsLoading(true);
      try {
        const cleanedData = await executeCleaningCode(code, fileData);
        setFileData(cleanedData);
        const newMetadata: FileMetadata = { ...fileMetadata, rowCount: cleanedData.length, preview: cleanedData.slice(0, 5) };
        setFileMetadata(newMetadata);
        const successMsg: Message = { id: `system-${Date.now()}`, type: MessageType.SYSTEM, content: "Data cleaned successfully. Re-profiling the updated data..."};
        setMessages(prev => [...prev, successMsg]);
        await runInitialProfile(cleanedData, newMetadata, dataContext!);
      } catch (error) {
           const errorMessage: Message = {
            id: `error-${Date.now()}`,
            type: MessageType.AI,
            content: { type: 'error', title: 'Failed to Apply Fix', data: error instanceof Error ? error.message : "An unknown error occurred." },
           };
           setMessages(prev => [...prev, errorMessage]);
      }
      setIsLoading(false);
  };

    const handleApplyMissingValueFix = async (profile: ColumnProfile, strategy: string, customValue?: string | number) => {
        if (!profile) return;
        setMissingValueFixConfig(null);
        let code = '';
        const col = profile.column.replace(/'/g, "\\'");
        const getFillLogic = (fillValue: string) => `return data.map(row => { const newRow = {...row}; if (row['${col}'] === null || row['${col}'] === undefined || row['${col}'] === '') { newRow['${col}'] = ${fillValue}; } return newRow; });`;
        switch (strategy) {
            case 'remove_rows': code = `return data.filter(row => row['${col}'] !== null && row['${col}'] !== undefined && row['${col}'] !== '');`; break;
            case 'fill_mean': code = getFillLogic(String(profile.stats.mean)); break;
            case 'fill_median': code = getFillLogic(String(profile.stats.median)); break;
            case 'fill_zero': code = getFillLogic('0'); break;
            case 'fill_mode':
                const mode = profile.stats.mode;
                if (mode === null || mode === undefined) {
                    setMessages(p => [...p, { id: `error-${Date.now()}`, type: MessageType.AI, content: { type: 'error', title: 'Fix Failed', data: `Could not apply fix: Mode for column '${profile.column}' is not available.` }}]);
                    return;
                }
                code = getFillLogic(typeof mode === 'string' ? `'${mode.replace(/'/g, "\\'")}'` : String(mode));
                break;
            case 'fill_custom': code = getFillLogic(typeof customValue === 'string' ? `'${String(customValue).replace(/'/g, "\\'")}'` : String(customValue)); break;
        }
        if (code) await handleApplyFix(code);
    };

    const handlePinToDashboard = (result: AnalysisResult) => {
        const newWidget: DashboardWidget = { id: `widget-${Date.now()}`, content: result };
        setDashboardWidgets(prev => [...prev, newWidget]);
        const newLayoutItem: Layout = { 
            i: newWidget.id, 
            x: (dashboardWidgets.length * 6) % 12, 
            y: Infinity, 
            w: 6, 
            h: 4,
            resizeHandles: ['sw', 'se', 'nw', 'ne']
        };
        setLayouts(prev => ({ lg: [...(prev.lg || []), newLayoutItem] }));
    };
    
    const handleDeleteWidget = (widgetId: string) => {
        setDashboardWidgets(prev => prev.filter(w => w.id !== widgetId));
        setLayouts(prev => ({ lg: prev.lg?.filter(l => l.i !== widgetId) || [] }));
    };

    const handleUpdateWidget = (widgetId: string, newContent: Partial<AnalysisResult>) => {
        setDashboardWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, content: { ...w.content, ...newContent } } : w));
    };

  const handleAction = useCallback(async (action: string, data: any) => {
    switch (action) {
      case 'retry': handleSendMessage(data.query as string); break;
      case 'suggest_fix': handleSuggestFix(data.issue as DataQualityIssue); break;
      case 'show_missing_value_fix_options': setMissingValueFixConfig({ issue: data.issue, profile: data.profile }); break;
      case 'apply_fix':
        setMessages(prev => prev.filter(m => (m.content as AnalysisResult)?.type !== 'code_confirmation'));
        handleApplyFix(data.code as string);
        break;
      case 'cancel_fix': setMessages(prev => prev.filter(m => m.id !== data.id)); break;
      case 'pin_to_dashboard': handlePinToDashboard(data.result as AnalysisResult); break;
      case 'delete_widget': handleDeleteWidget(data.id as string); break;
      case 'update_widget': handleUpdateWidget(data.id as string, data.content as Partial<AnalysisResult>); break;
    }
  }, [handleSendMessage, messages, dashboardWidgets]);

  const handleDrillDown = useCallback((category: string, queryHint: string) => {
    const query = queryHint.replace('{name}', category);
    handleSendMessage(query);
  }, [handleSendMessage]);

  const renderContent = () => {
    switch (appState) {
      case 'UPLOADING': return <FileUpload onDataLoaded={handleDataLoaded} />;
      case 'CONTEXT_INPUT': return <DataContextForm metadata={fileMetadata!} onContinue={handleContextProvided} />;
      case 'VIEWING':
        return (
          <div className="h-full w-full flex flex-col bg-zinc-900/70 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden border border-zinc-700/50">
            <header className="p-4 border-b border-zinc-700 bg-zinc-900/80 backdrop-blur-sm flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-100">Tada</h2>
                        <div className="text-sm text-gray-400">
                            <span>{fileMetadata?.columns.length} columns</span><span className="mx-2">·</span>
                            <span>{fileMetadata?.rowCount.toLocaleString()} rows</span><span className="mx-2">·</span>
                            <span className="italic truncate max-w-xs inline-block align-bottom">{fileMetadata?.fileName}</span>
                        </div>
                    </div>
                    <nav className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg">
                        <button onClick={() => setActiveView('CHAT')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'CHAT' ? 'bg-zinc-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'}`}><ChatBubbleIcon className="w-4 h-4" />Chat</button>
                        <button onClick={() => setActiveView('DASHBOARD')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'DASHBOARD' ? 'bg-zinc-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'}`}><DashboardIcon className="w-4 h-4" />Dashboard</button>
                    </nav>
                </div>
            </header>
            <div className="flex-1 min-h-0">
              {activeView === 'CHAT' ? (
                <ChatInterface messages={messages} onSendMessage={handleSendMessage} onAction={handleAction} onDrillDown={handleDrillDown} isLoading={isLoading} metadata={fileMetadata!} fullData={fileData!} suggestedQuestions={suggestedQuestions} />
              ) : (
                <Dashboard widgets={dashboardWidgets} layouts={layouts} onLayoutChange={setLayouts} onAction={handleAction} />
              )}
            </div>
          </div>
        );
      default: return <FileUpload onDataLoaded={handleDataLoaded} />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-900">
      {missingValueFixConfig && ( <MissingValueFixer config={missingValueFixConfig} onApplyFix={handleApplyMissingValueFix} onCancel={() => setMissingValueFixConfig(null)} /> )}
      <main className="w-full h-[calc(100vh-2rem)] max-w-7xl">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;