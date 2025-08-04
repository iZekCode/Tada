import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { DataRecord } from '../types';
import * as ReactTable from '@tanstack/react-table';
import { ChevronUpIcon, ChevronDownIcon, FilterIcon } from './icons';


interface TableRendererProps {
  data: DataRecord[];
  isDashboardWidget?: boolean;
}

const TableRenderer: React.FC<TableRendererProps> = ({ data, isDashboardWidget = false }) => {
  const [sorting, setSorting] = useState<ReactTable.SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ReactTable.ColumnFiltersState>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo<ReactTable.ColumnDef<DataRecord>[]>(() => {
    if (!data || data.length === 0) return [];
    const headers = Object.keys(data[0]);
    return headers.map(header => ({
      accessorKey: header,
      header: () => <span>{header}</span>,
      cell: info => {
        const value = info.getValue();
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        return String(value);
      },
    }));
  }, [data]);

  const table = ReactTable.useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: ReactTable.getCoreRowModel(),
    getSortedRowModel: ReactTable.getSortedRowModel(),
    getFilteredRowModel: ReactTable.getFilteredRowModel(),
    getPaginationRowModel: ReactTable.getPaginationRowModel(),
  });
  
  useEffect(() => {
    if (!isDashboardWidget) {
        table.setPageSize(10);
        return;
    }

    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
        if (containerRef.current) {
            const headerHeight = 45; 
            const footerHeight = 42; 
            const rowHeight = 45;
            const availableHeight = containerRef.current.clientHeight - headerHeight - footerHeight;
            const newPageSize = Math.max(1, Math.floor(availableHeight / rowHeight));
            if (table.getState().pagination.pageSize !== newPageSize) {
                table.setPageSize(newPageSize);
            }
        }
    });

    resizeObserver.observe(containerRef.current);
    // Initial calculation
    if (containerRef.current) {
        const headerHeight = 45; 
        const footerHeight = 42; 
        const rowHeight = 45;
        const availableHeight = containerRef.current.clientHeight - headerHeight - footerHeight;
        const newPageSize = Math.max(1, Math.floor(availableHeight / rowHeight));
        table.setPageSize(newPageSize);
    }
    
    return () => resizeObserver.disconnect();
  }, [isDashboardWidget, table]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
            setActiveFilterId(null);
        }
    };
    if (activeFilterId) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeFilterId]);

  if (!data || data.length === 0) {
    return <p className="text-gray-500">No data to display.</p>;
  }
  
  const containerClasses = isDashboardWidget
    ? "w-full h-full flex flex-col"
    : "w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800";


  return (
     <div ref={containerRef} className={containerClasses}>
      <div className="w-full overflow-x-auto overflow-y-auto flex-grow">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-zinc-700/50 text-sm text-gray-400 uppercase sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} scope="col" className="px-4 py-3 font-medium">
                    <div className="flex items-center justify-between gap-2">
                        <div
                          className={header.column.getCanSort() ? 'cursor-pointer select-none flex items-center gap-2' : 'flex items-center gap-2'}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {ReactTable.flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ChevronUpIcon className="w-4 h-4" />,
                            desc: <ChevronDownIcon className="w-4 h-4" />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                        {header.column.getCanFilter() ? (
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveFilterId(activeFilterId === header.column.id ? null : header.column.id);
                                }}
                                className={`p-1 rounded transition-colors ${header.column.getIsFiltered() ? 'text-[#39FF14] bg-[#39FF14]/10' : 'text-zinc-400 hover:bg-zinc-600'}`}
                                aria-label={`Filter by ${header.column.id}`}
                            >
                                <FilterIcon className="w-4 h-4" />
                            </button>
                            {activeFilterId === header.column.id && (
                                <div
                                    ref={popoverRef}
                                    className="absolute top-full right-0 mt-2 p-3 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg z-10 w-48"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <p className="text-sm font-semibold text-gray-300 mb-2 normal-case tracking-normal">Filter by {ReactTable.flexRender(header.column.columnDef.header, header.getContext())}</p>
                                    <input
                                        type="text"
                                        value={(header.column.getFilterValue() ?? '') as string}
                                        onChange={e => header.column.setFilterValue(e.target.value)}
                                        placeholder={`Search...`}
                                        className="w-full text-sm bg-zinc-800 border-zinc-600 rounded-md shadow-sm p-1.5 normal-case"
                                        aria-label="Filter input"
                                    />
                                </div>
                            )}
                        </div>
                    ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="bg-zinc-800 border-b border-zinc-700 hover:bg-zinc-700/50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3">
                    {ReactTable.flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between p-2 bg-zinc-900/50 border-t border-zinc-700 flex-shrink-0">
        <span className="text-sm text-gray-400">
          Page{' '}
          <strong>
            {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </strong>
        </span>
        <div className="flex gap-2">
            <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-2 py-1 text-sm font-semibold text-gray-300 bg-zinc-700 border border-zinc-600 rounded-md hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Previous
            </button>
            <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-2 py-1 text-sm font-semibold text-gray-300 bg-zinc-700 border border-zinc-600 rounded-md hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next
            </button>
        </div>
      </div>
    </div>
  );
};

export default TableRenderer;
