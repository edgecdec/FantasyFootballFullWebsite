'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  Typography
} from '@mui/material';

// --- Types ---

export type Order = 'asc' | 'desc';

export interface Column<T> {
  id: string; // Unique ID for the column, can be property path like 'stats.points'
  label: string;
  numeric?: boolean;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode; // Optional custom renderer
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T | ((row: T) => string); // Unique key for mapping
  defaultSortBy?: string;
  defaultSortOrder?: Order;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  onRowClick?: (row: T) => void;
  noDataMessage?: string;
}

// --- Sorting Helpers ---

function descendingComparator<T>(a: T, b: T, orderBy: string) {
  let aValue: any;
  let bValue: any;

  // Handle nested properties (e.g. 'stats.points')
  if (orderBy.includes('.')) {
    const keys = orderBy.split('.');
    aValue = a;
    bValue = b;
    for (const key of keys) {
      aValue = (aValue as any)?.[key];
      bValue = (bValue as any)?.[key];
    }
  } else {
    aValue = (a as any)[orderBy];
    bValue = (b as any)[orderBy];
  }

  // Handle nulls/undefined - push to bottom
  if (bValue === null || bValue === undefined) return -1;
  if (aValue === null || aValue === undefined) return 1;

  // String comparison
  if (typeof aValue === 'string') aValue = aValue.toLowerCase();
  if (typeof bValue === 'string') bValue = bValue.toLowerCase();

  if (bValue < aValue) return -1;
  if (bValue > aValue) return 1;
  return 0;
}

function getComparator<T>(
  order: Order,
  orderBy: string,
): (a: T, b: T) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// --- Component ---

export default function DataTable<T>({
  data,
  columns,
  keyField,
  defaultSortBy,
  defaultSortOrder = 'asc',
  rowsPerPageOptions = [10, 25, 50, 100],
  defaultRowsPerPage = 25,
  onRowClick,
  noDataMessage = "No data found."
}: DataTableProps<T>) {
  // State
  const [order, setOrder] = React.useState<Order>(defaultSortOrder);
  const [orderBy, setOrderBy] = React.useState<string>(defaultSortBy || columns[0]?.id || '');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(defaultRowsPerPage);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Sort & Paginate
  const visibleRows = React.useMemo(() => {
    const sorted = [...data].sort(getComparator(order, orderBy));
    return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [data, order, orderBy, page, rowsPerPage]);

  // Reset page if data length changes drastically (optional UX choice)
  React.useEffect(() => {
    if (page > 0 && data.length < page * rowsPerPage) {
      setPage(0);
    }
  }, [data.length]);

  return (
    <Paper sx={{ width: '100%', mb: 2 }}>
      <TableContainer>
        <Table sx={{ minWidth: 750 }} size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || (column.numeric ? 'right' : 'left')}
                  sortDirection={orderBy === column.id ? order : false}
                  sx={{ fontWeight: 'bold', width: column.width }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row, index) => {
              const key = typeof keyField === 'function' ? keyField(row) : (row as any)[keyField];
              return (
                <TableRow
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  role="checkbox"
                  tabIndex={-1}
                  key={key}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((column) => {
                    // Extract value for default rendering
                    let value: any = row;
                    if (column.id.includes('.')) {
                      const keys = column.id.split('.');
                      for (const k of keys) value = value?.[k];
                    } else {
                      value = (row as any)[column.id];
                    }

                    return (
                      <TableCell 
                        key={column.id} 
                        align={column.align || (column.numeric ? 'right' : 'left')}
                      >
                        {column.render ? column.render(row) : value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    {noDataMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
