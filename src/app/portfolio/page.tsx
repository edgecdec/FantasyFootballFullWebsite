'use client';

import * as React from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  LinearProgress,
  Chip,
  Alert,
  Avatar,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Autocomplete
} from '@mui/material';
import { SleeperService, SleeperUser, SleeperMatchup } from '@/services/sleeper/sleeperService';
import playerData from '../../../data/sleeper_players.json';
import DataTable, { Column } from '@/components/common/SmartTable';

// Types
type PortfolioItem = {
  playerId: string;
  playerData: any; 
  shares: number;
  startersCount: number;
  benchCount: number;
  exposure: number;
  leagues: {
    id: string;
    name: string;
  }[];
};

const YEARS = ['2025', '2024', '2023', '2022', '2021', '2020'];
const WEEKS = Array.from({length: 18}, (_, i) => i + 1);

export default function PortfolioPage() {
  // State
  const [username, setUsername] = React.useState('');
  const [savedUsernames, setSavedUsernames] = React.useState<string[]>([]);
  const [year, setYear] = React.useState('2025');
  const [week, setWeek] = React.useState<string>('live'); // 'live' or '1'...'18'
  
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  
  const [user, setUser] = React.useState<SleeperUser | null>(null);
  const [portfolio, setPortfolio] = React.useState<PortfolioItem[]>([]);
  const [totalLeagues, setTotalLeagues] = React.useState(0);

  // Load Saved Usernames
  React.useEffect(() => {
    const saved = localStorage.getItem('sleeper_usernames');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedUsernames(parsed);
        if (parsed.length > 0 && !username) setUsername(parsed[0]);
      } catch (e) { console.error(e); }
    }
  }, []);

  const saveUsername = (name: string) => {
    if (!name) return;
    const newSaved = [name, ...savedUsernames.filter(u => u !== name)].slice(0, 5);
    setSavedUsernames(newSaved);
    localStorage.setItem('sleeper_usernames', JSON.stringify(newSaved));
  };

  // Auto-analyze triggers
  React.useEffect(() => {
    if (username && !loading && user) {
      handleAnalyze();
    }
  }, [year, week]);

  const handleAnalyze = async () => {
    if (!username) return;
    
    setLoading(true);
    setError(null);
    setProgress(0);
    setPortfolio([]);
    
    // Don't clear user here if it's just a week switch, but safety check:
    // setUser(null); 

    try {
      // 1. Get User (or reuse)
      let currentUser = user;
      if (!currentUser || currentUser.username.toLowerCase() !== username.toLowerCase()) {
        currentUser = await SleeperService.getUser(username);
        if (!currentUser) throw new Error('User not found');
        setUser(currentUser);
        saveUsername(username);
      }

      // 2. Get Leagues
      const leagues = await SleeperService.getLeagues(currentUser.user_id, year);
      setTotalLeagues(leagues.length);

      if (leagues.length === 0) {
        setLoading(false);
        return;
      }

      // 3. Fetch Rosters (Always needed for Owner ID -> Roster ID mapping)
      // Note: If we are doing 'live' view, we treat this as 50% of work. 
      // If doing historical, this is 50%, matchups are 50%.
      const rosterMap = await SleeperService.fetchAllRosters(
        leagues, 
        currentUser.user_id,
        (completed, total) => {
          // If we also need matchups, this is only the first half of progress
          const scale = week === 'live' ? 100 : 50;
          setProgress((completed / total) * scale);
        }
      );

      // 4. Fetch Matchups (If historical)
      let matchupMap = new Map<string, SleeperMatchup[]>();
      if (week !== 'live') {
        matchupMap = await SleeperService.fetchAllMatchups(
          leagues,
          parseInt(week, 10),
          (completed, total) => {
            // Second half of progress (50% to 100%)
            setProgress(50 + (completed / total) * 50);
          }
        );
      }

      // 5. Aggregation
      const playerCounts = new Map<string, { count: number, startCount: number, benchCount: number, leagueIds: string[] }>();
      
      leagues.forEach(league => {
        const userRoster = rosterMap.get(league.league_id);
        if (!userRoster) return; // User not in this league (or error)

        let players: string[] = [];
        let starters: string[] = [];

        if (week === 'live') {
          // Use current roster state
          players = userRoster.players || [];
          starters = userRoster.starters || [];
        } else {
          // Use historical matchup data
          const leagueMatchups = matchupMap.get(league.league_id);
          const myMatchup = leagueMatchups?.find(m => m.roster_id === userRoster.roster_id);
          
          if (myMatchup) {
            players = myMatchup.players || [];
            starters = myMatchup.starters || [];
          }
        }

        // Count 'em
        players.forEach(pid => {
          const current = playerCounts.get(pid) || { count: 0, startCount: 0, benchCount: 0, leagueIds: [] };
          current.count++;
          
          if (starters.includes(pid)) {
            current.startCount++;
          } else {
            current.benchCount++;
          }

          current.leagueIds.push(league.league_id);
          playerCounts.set(pid, current);
        });
      });

      // 6. Build Items
      const items: PortfolioItem[] = [];
      const playersJson = (playerData as any).players;

      playerCounts.forEach((data, pid) => {
        const pInfo = playersJson[pid];
        if (pInfo && ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(pInfo.position)) {
           items.push({
             playerId: pid,
             playerData: pInfo,
             shares: data.count,
             startersCount: data.startCount,
             benchCount: data.benchCount,
             exposure: (data.count / leagues.length) * 100,
             leagues: data.leagueIds.map(lid => {
               const l = leagues.find(x => x.league_id === lid);
               return { id: lid, name: l ? l.name : 'Unknown League' };
             })
           });
        }
      });

      setPortfolio(items);

    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Define Columns
  const columns: Column<PortfolioItem>[] = [
    { 
      id: 'playerData.last_name', 
      label: 'Player', 
      render: (item) => (
        <Typography fontWeight="bold">
          {item.playerData.first_name} {item.playerData.last_name}
        </Typography>
      )
    },
    { 
      id: 'playerData.position', 
      label: 'Position', 
      filterVariant: 'multi-select', 
      render: (item) => (
        <Chip 
          label={item.playerData.position} 
          size="small"
          color={
            item.playerData.position === 'QB' ? 'error' :
            item.playerData.position === 'RB' ? 'success' :
            item.playerData.position === 'WR' ? 'info' :
            item.playerData.position === 'TE' ? 'warning' : 'default'
          } 
        />
      )
    },
    { 
      id: 'playerData.team', 
      label: 'Team',
      filterVariant: 'multi-select'
    },
    { 
      id: 'shares', 
      label: 'Shares', 
      numeric: true,
      render: (item) => <Typography fontWeight="bold" fontSize="1.1rem">{item.shares}</Typography>
    },
    { 
      id: 'startersCount', 
      label: 'Start', 
      numeric: true,
      render: (item) => <Typography color="success.main" fontWeight="bold">{item.startersCount}</Typography>
    },
    { 
      id: 'benchCount', 
      label: 'Bench', 
      numeric: true,
      render: (item) => <Typography color="text.secondary">{item.benchCount}</Typography>
    },
    { 
      id: 'exposure', 
      label: 'Exposure', 
      numeric: true,
      render: (item) => `${item.exposure.toFixed(0)}%`
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
       <Typography variant="h4" gutterBottom fontWeight="bold">
        Fantasy Portfolio Tracker
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Analyze your exposure across all your Sleeper leagues.
      </Typography>

      {/* Input Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Autocomplete
            freeSolo
            options={savedUsernames}
            value={username}
            onInputChange={(e, newVal) => setUsername(newVal)}
            renderInput={(params) => (
              <TextField {...params} label="Sleeper Username" variant="outlined" sx={{ minWidth: 200 }} />
            )}
            disabled={loading}
          />
          
          <FormControl sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={year}
              label="Year"
              onChange={(e) => setYear(e.target.value)}
              disabled={loading}
            >
              {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Week</InputLabel>
            <Select
              value={week}
              label="Week"
              onChange={(e) => setWeek(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="live">Live / End</MenuItem>
              {WEEKS.map(w => <MenuItem key={w} value={w.toString()}>Week {w}</MenuItem>)}
            </Select>
          </FormControl>

          <Button 
            variant="contained" 
            size="large" 
            onClick={handleAnalyze}
            disabled={loading || !username}
            sx={{ height: 56 }}
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ width: '100%', mb: 4 }}>
          <Typography variant="body2" gutterBottom>
            Scanning Leagues... {Math.round(progress)}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {/* Results */}
      {user && !loading && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar 
              src={`https://sleepercdn.com/avatars/${user.avatar}`} 
              sx={{ width: 56, height: 56 }}
            />
            <Box>
              <Typography variant="h5">{user.display_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {totalLeagues} Leagues found in {year} {week !== 'live' ? `(Week ${week})` : ''}
              </Typography>
            </Box>
          </Box>

          <DataTable
            data={portfolio}
            columns={columns}
            keyField="playerId"
            defaultSortBy="shares"
            defaultSortOrder="desc"
            defaultRowsPerPage={25}
            noDataMessage="No players found in your rosters."
          />
        </>
      )}
    </Container>
  );
}