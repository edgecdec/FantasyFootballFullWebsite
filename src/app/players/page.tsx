'use client';

import * as React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Chip,
  TableSortLabel
} from '@mui/material';

// Import JSON data
import playerData from '../../../data/sleeper_players.json';

type PlayerStats = {
  pts_std: number;
  pts_half_ppr: number;
  pts_ppr: number;
  gp: number;
  pass_yd: number;
  pass_td: number;
  rush_yd: number;
  rush_td: number;
  rec_yd: number;
  rec_td: number;
};

type Player = {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  active: boolean;
  age?: number;
  number?: number;
  stats?: PlayerStats; 
};

// 1. Process data on load
const ALL_PLAYERS: Player[] = Object.values(playerData.players)
  .filter((p: any) => p.position && ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position))
  .map((p: any) => ({
    player_id: p.player_id,
    first_name: p.first_name,
    last_name: p.last_name,
    position: p.position,
    team: p.team || 'FA',
    active: p.active,
    age: p.age,
    number: p.number,
    stats: p.stats || null
  }));

// Extract unique teams for dropdown
const TEAMS = Array.from(new Set(ALL_PLAYERS.map(p => p.team).filter(t => t && t !== 'FA'))).sort();

// Sorting Helper
type Order = 'asc' | 'desc';

function descendingComparator<T>(a: T, b: T, orderBy: keyof T | string) {
  let aValue: any;
  let bValue: any;

  // Handle nested stats sorting
  if (orderBy.startsWith('stats.')) {
    const statKey = orderBy.split('.')[1] as keyof PlayerStats;
    aValue = (a as any).stats?.[statKey] ?? -9999;
    bValue = (b as any).stats?.[statKey] ?? -9999;
  } else {
    aValue = (a as any)[orderBy] ?? '';
    bValue = (b as any)[orderBy] ?? '';
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
  }

  if (bValue < aValue) return -1;
  if (bValue > aValue) return 1;
  return 0;
}

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// Headers Configuration
const HEAD_CELLS = [
  { id: 'last_name', label: 'Name', numeric: false },
  { id: 'position', label: 'Pos', numeric: false },
  { id: 'team', label: 'Team', numeric: false },
  { id: 'stats.pts_std', label: 'Std Pts', numeric: true },
  { id: 'stats.pts_half_ppr', label: 'Half PPR', numeric: true },
  { id: 'stats.pts_ppr', label: 'PPR Pts', numeric: true },
  { id: 'stats.gp', label: 'GP', numeric: true },
];

export default function PlayersPage() {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [filterName, setFilterName] = React.useState('');
  const [filterPos, setFilterPos] = React.useState('ALL');
  const [filterTeam, setFilterTeam] = React.useState('ALL');
  
  // Sorting State
  const [order, setOrder] = React.useState<Order>('desc');
  const [orderBy, setOrderBy] = React.useState<string>('stats.pts_half_ppr');

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // 1. Filter
  const filteredPlayers = React.useMemo(() => {
    return ALL_PLAYERS.filter(player => {
      const matchesName = 
        player.first_name.toLowerCase().includes(filterName.toLowerCase()) || 
        player.last_name.toLowerCase().includes(filterName.toLowerCase());
      
      const matchesPos = filterPos === 'ALL' || player.position === filterPos;
      const matchesTeam = filterTeam === 'ALL' || player.team === filterTeam;

      return matchesName && matchesPos && matchesTeam;
    });
  }, [filterName, filterPos, filterTeam]);

  // 2. Sort & Paginate
  const visibleRows = React.useMemo(() => {
    const sorted = [...filteredPlayers].sort(getComparator(order, orderBy));
    return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredPlayers, order, orderBy, page, rowsPerPage]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Player Database & Stats (2025)
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField 
            label="Search Player" 
            variant="outlined" 
            size="small"
            value={filterName}
            onChange={(e) => {
              setFilterName(e.target.value);
              setPage(0); 
            }}
            sx={{ minWidth: 200 }}
          />
          
          <TextField
            select
            label="Position"
            value={filterPos}
            onChange={(e) => {
              setFilterPos(e.target.value);
              setPage(0); 
            }}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="ALL">All Positions</MenuItem>
            <MenuItem value="QB">QB</MenuItem>
            <MenuItem value="RB">RB</MenuItem>
            <MenuItem value="WR">WR</MenuItem>
            <MenuItem value="TE">TE</MenuItem>
            <MenuItem value="K">K</MenuItem>
            <MenuItem value="DEF">DEF</MenuItem>
          </TextField>

          <TextField
            select
            label="Team"
            value={filterTeam}
            onChange={(e) => {
              setFilterTeam(e.target.value);
              setPage(0); 
            }}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="ALL">All Teams</MenuItem>
            {TEAMS.map((team) => (
              <MenuItem key={team} value={team}>{team}</MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 750 }} size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              {HEAD_CELLS.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.numeric ? 'right' : 'left'}
                  sortDirection={orderBy === headCell.id ? order : false}
                  sx={{ fontWeight: 'bold' }}
                >
                  <TableSortLabel
                    active={orderBy === headCell.id}
                    direction={orderBy === headCell.id ? order : 'asc'}
                    onClick={() => handleRequestSort(headCell.id)}
                  >
                    {headCell.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((player) => (
              <TableRow key={player.player_id} hover>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                  {player.first_name} {player.last_name}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={player.position} 
                    color={
                      player.position === 'QB' ? 'error' :
                      player.position === 'RB' ? 'success' :
                      player.position === 'WR' ? 'info' :
                      player.position === 'TE' ? 'warning' : 'default'
                    }
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{player.team}</TableCell>
                
                {/* Stats Columns */}
                <TableCell align="right">{player.stats?.pts_std?.toFixed(1) || '-'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {player.stats?.pts_half_ppr?.toFixed(1) || '-'}
                </TableCell>
                <TableCell align="right">{player.stats?.pts_ppr?.toFixed(1) || '-'}</TableCell>
                <TableCell align="right">{player.stats?.gp || '-'}</TableCell>
              </TableRow>
            ))}
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No players found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[25, 50, 100]}
        component="div"
        count={filteredPlayers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Container>
  );
}