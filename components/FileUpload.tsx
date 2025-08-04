import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { DataRecord, FileMetadata } from '../types';
import { UploadCloudIcon, LoaderIcon } from './icons';

interface FileUploadProps {
  onDataLoaded: (data: DataRecord[], metadata: FileMetadata) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let jsonData: DataRecord[];

        if (fileExtension === 'csv') {
          const parsed = Papa.parse(data as string, { header: true, skipEmptyLines: true });
          if (parsed.errors.length > 0) {
              throw new Error(`CSV Parsing Error: ${parsed.errors[0].message}`);
          }
          jsonData = parsed.data as DataRecord[];
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet) as DataRecord[];
        } else {
          throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
        }
        
        if (jsonData.length === 0) {
            throw new Error('The file is empty or could not be parsed correctly.');
        }

        const columns = Object.keys(jsonData[0]);
        const metadata: FileMetadata = {
            fileName: file.name,
            columns,
            rowCount: jsonData.length,
            preview: jsonData.slice(0, 5),
        };
        
        onDataLoaded(jsonData, metadata);

      } catch (err: any) {
        setError(err.message || 'Failed to process the file.');
        setIsLoading(false);
        setFileName(null);
      }
    };
    
    reader.onerror = () => {
        setError('Failed to read the file.');
        setIsLoading(false);
        setFileName(null);
    };

    if (fileExtension === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  }, [onDataLoaded]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };
  
  const customStyles = `
    .graphic-glow {
        background: radial-gradient(circle, rgba(57, 255, 20, 0.15), rgba(0, 201, 167, 0) 60%);
        animation: pulse 4s infinite ease-in-out;
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.05); opacity: 1; }
    }
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
    }
    .float-element {
        animation: float 6s ease-in-out infinite;
    }
  `;

  return (
    <>
    <style>{customStyles}</style>
    <div className="w-full h-full relative flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-5xl font-bold text-gray-100 tracking-tight sm:text-6xl" style={{textShadow: '0 2px 20px rgba(57, 255, 20, 0.4)'}}>
        Chat with your data.
      </h1>
      <p className="mt-10 text-lg text-gray-300 max-w-xl">
        Ask any question, get instant insights. No code required.
      </p>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative mt-10 w-full max-w-md h-64 flex items-center justify-center"
      >
        <input
            type="file"
            id="file-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept=".csv, .xlsx, .xls"
            disabled={isLoading}
        />
        <div className="absolute inset-0 graphic-glow rounded-full"></div>

        {isLoading ? (
            <div className="relative z-10 flex flex-col items-center justify-center space-y-4 text-white">
                <LoaderIcon className="w-12 h-12 text-[#39FF14] animate-spin" />
                <p className="font-medium">Processing "{fileName}"...</p>
            </div>
        ) : (
          <>
            {/* Abstract Bar Chart */}
            <svg viewBox="0 0 100 100" className="absolute w-24 h-24 text-[#00C9A7]/80 float-element" style={{ top: '10%', left: '15%', animationDelay: '-2s', filter: 'drop-shadow(0 0 10px rgba(0, 201, 167, 0.5))' }}>
                <rect x="10" y="60" width="10" height="40" rx="2" fill="currentColor" opacity="0.5"/>
                <rect x="30" y="40" width="10" height="60" rx="2" fill="currentColor"/>
                <rect x="50" y="20" width="10" height="80" rx="2" fill="currentColor" opacity="0.6"/>
                <rect x="70" y="50" width="10" height="50" rx="2" fill="currentColor" opacity="0.8"/>
            </svg>

            {/* Abstract Line Chart */}
            <svg viewBox="0 0 100 100" className="absolute w-28 h-28 text-[#39FF14]/80 float-element" style={{ bottom: '5%', right: '10%', animationDelay: '0s', filter: 'drop-shadow(0 0 10px rgba(57, 255, 20, 0.5))' }}>
                <path d="M 10 80 C 30 20, 70 100, 90 20" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round"/>
                <circle cx="90" cy="20" r="4" fill="currentColor"/>
            </svg>
            
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-gray-900/50 scale-105 rounded-3xl' : ''}`}>
                 {isDragging && (
                    <div className="flex flex-col items-center gap-2 text-white font-semibold">
                       <UploadCloudIcon className="w-8 h-8"/>
                       <span>Drop file to analyze</span>
                    </div>
                )}
            </div>
          </>
        )}
      </div>

      <div className="mt-10">
        <label
          htmlFor="file-upload"
          className="relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-zinc-900 bg-gradient-to-r from-[#39FF14] to-[#00C9A7] rounded-lg shadow-lg cursor-pointer transition-transform duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{boxShadow: '0 10px 30px -10px rgba(0, 201, 167, 0.6)'}}
        >
          {isLoading ? 'Loading...' : 'Upload Your Data'}
        </label>
      </div>

      <p className="mt-10 text-xs text-gray-500 tracking-wider">Powered by Gemini</p>
      
      {error && (
        <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg w-full max-w-md" role="alert">
            <p className="font-semibold">Upload Failed</p>
            <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
    </>
  );
};

export default FileUpload;
