interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  onPageChange?: (page: number) => void;
  page?: number;
  totalPages?: number;
}

export const DataTable = ({ columns, data, loading, page = 1, totalPages = 1, onPageChange }: DataTableProps) => (
  <div className="bg-dark-800 rounded-xl overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-700">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} className="text-center py-8 text-dark-400">Loading...</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center py-8 text-dark-400">No data</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={row._id || i} className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm">{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    {totalPages > 1 && (
      <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700">
        <button disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} className="text-sm text-dark-400 disabled:opacity-30">Previous</button>
        <span className="text-sm text-dark-400">Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} className="text-sm text-dark-400 disabled:opacity-30">Next</button>
      </div>
    )}
  </div>
);
