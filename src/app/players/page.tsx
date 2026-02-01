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
  CircularProgress
} from '@mui/material';

// We import the JSON directly. Next.js handles this efficiently in build.
// Note: In a real "active" app, you might fetch this from an API endpoint 
// to avoid bundling 5MB into the client bundle, but for a skeleton it works.
import playerData from '../../../data/sleeper_players.json';

type Player = {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  active: boolean;
  age?: number;
  number?: number;
};

// Convert the dictionary to an array once
const ALL_PLAYERS = Object.values(playerData.players)
  .filter((p: any) => p.position && ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position)) // Filter to fantasy relevant positions initially
  .map((p: any) => ({
    player_id: p.player_id,
    first_name: p.first_name,
    last_name: p.last_name,
    position: p.position,
    team: p.team || 'FA',
    active: p.active,
    age: p.age,
    number: p.number
  }));

export default function PlayersPage() {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [filterName, setFilterName] = React.useState('');
  const [filterPos, setFilterPos] = React.useState('ALL');

  // Filter logic
  const filteredPlayers = React.useMemo(() => {
    return ALL_PLAYERS.filter(player => {
      const matchesName = 
        player.first_name.toLowerCase().includes(filterName.toLowerCase()) || 
        player.last_name.toLowerCase().includes(filterName.toLowerCase());
      
      const matchesPos = filterPos === 'ALL' || player.position === filterPos;

      return matchesName && matchesPos;
    });
  }, [filterName, filterPos]);

  // Pagination logic
  const displayedPlayers = React.useMemo(() => {
    return filteredPlayers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredPlayers, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Player Database
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField 
            label="Search Player" 
            variant="outlined" 
            size="small"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          
          <TextField
            select
            label="Position"
            value={filterPos}
            onChange={(e) => setFilterPos(e.target.value)}
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
          
          <Box sx={{ ml: 'auto', alignSelf: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Players: {filteredPlayers.length}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell>Name</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Number</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedPlayers.map((player) => (
              <TableRow
                key={player.player_id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
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
                <TableCell>{player.age || '-'}</TableCell>
                <TableCell>{player.number ? `#${player.number}` : '-'}</TableCell>
                <TableCell>
                  {player.active ? (
                    <Typography variant="caption" color="success.main" fontWeight="bold">ACTIVE</Typography>
                  ) : (
                     <Typography variant="caption" color="text.disabled">INACTIVE</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {displayedPlayers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  No players found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={filteredPlayers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Container>
  );
}
