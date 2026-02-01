'use client';

import * as React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { SleeperService, SleeperUser, SleeperLeague, SleeperRoster, SleeperBracketMatch } from '@/services/sleeper/sleeperService';

// --- Types ---
type LeaguePerformance = {
  leagueId: string;
  name: string;
  avatar: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  rank: number;
  rosterId: number;
  pointsFor: number;
  madePlayoffs: boolean;
};

// --- Helper Logic ---

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function determineFinalRank(
  rosterId: number, 
  rosters: SleeperRoster[], 
  winnersBracket: SleeperBracketMatch[], 
  league: SleeperLeague
): { rank: number, madePlayoffs: boolean } {
  // 1. Check Winners Bracket for Podium Finishes
  const championship = winnersBracket.find(m => m.p === 1);
  if (championship) {
    if (championship.w === rosterId) return { rank: 1, madePlayoffs: true };
    if (championship.l === rosterId) return { rank: 2, madePlayoffs: true };
  }

  const thirdPlace = winnersBracket.find(m => m.p === 3);
  if (thirdPlace) {
    if (thirdPlace.w === rosterId) return { rank: 3, madePlayoffs: true };
    if (thirdPlace.l === rosterId) return { rank: 4, madePlayoffs: true };
  }

  const fifthPlace = winnersBracket.find(m => m.p === 5);
  if (fifthPlace) {
    if (fifthPlace.w === rosterId) return { rank: 5, madePlayoffs: true };
    if (fifthPlace.l === rosterId) return { rank: 6, madePlayoffs: true };
  }

  // 2. Check if they made playoffs (present in any match in the bracket)
  const inPlayoffs = winnersBracket.some(m => m.t1 === rosterId || m.t2 === rosterId);
  
  // 3. Fallback: Regular Season Rank
  // Sort all rosters by Wins, then Points to determine base rank
  const sortedRosters = [...rosters].sort((a, b) => {
    if (a.settings.wins !== b.settings.wins) return b.settings.wins - a.settings.wins;
    return b.settings.fpts - a.settings.fpts;
  });

  const regSeasonRank = sortedRosters.findIndex(r => r.roster_id === rosterId) + 1;

  // If in playoffs but no specific placement match found (e.g. league stopped early?), 
  // or if they are 7th-12th, use reg season rank.
  // Note: This might calculate a "7th" place regular season team as "1st" if they had most wins? 
  // No, we only override for 1-6 from bracket.
  
  // Actually, if someone made playoffs, their rank should logically be better than those who didn't.
  // But without a placement match, it's ambiguous. 
  // Ideally we would return regSeasonRank but clamped to >6 if they didn't place? 
  // No, let's just trust the Bracket for top spots and Reg Season for the rest.
  
  return { rank: regSeasonRank, madePlayoffs: inPlayoffs };
}

// --- Main Component ---

export default function PerformancePage() {
  const [username, setUsername] = React.useState('');
  const [savedUsernames, setSavedUsernames] = React.useState<string[]>([]);
  const [year, setYear] = React.useState('2024'); // Default to previous completed season
  
  const [loadingUser, setLoadingUser] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [results, setResults] = React.useState<LeaguePerformance[]>([]);
  const [user, setUser] = React.useState<SleeperUser | null>(null);

  const YEARS = ['2024', '2023', '2022', '2021'];

  React.useEffect(() => {
    const saved = localStorage.getItem('sleeper_usernames');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedUsernames(parsed);
        if (parsed.length > 0) setUsername(parsed[0]);
      } catch (e) { console.error(e); }
    }
  }, []);

  const handleStart = async () => {
    if (!username) return;
    setLoadingUser(true);
    setAnalyzing(false);
    setResults([]);
    setProgress(0);

    try {
      const userRes = await SleeperService.getUser(username);
      if (!userRes) throw new Error('User not found');
      setUser(userRes);

      const leagues = await SleeperService.getLeagues(userRes.user_id, year);
      
      // Filter out ignored leagues
      const validLeagues = leagues.filter(l => !SleeperService.shouldIgnoreLeague(l));
      
      // Initialize Results
      setResults(validLeagues.map(l => ({
        leagueId: l.league_id,
        name: l.name,
        avatar: l.avatar || '',
        status: 'pending',
        rank: 0,
        rosterId: 0,
        pointsFor: 0,
        madePlayoffs: false
      })));

      setAnalyzing(true);
      processQueue(validLeagues, userRes.user_id);

    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUser(false);
    }
  };

  const processQueue = async (leagues: SleeperLeague[], userId: string) => {
    const total = leagues.length;
    let completed = 0;

    for (const league of leagues) {
      setResults(prev => prev.map(r => r.leagueId === league.league_id ? { ...r, status: 'loading' } : r));

      try {
        // Fetch Rosters
        const rosterRes = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`);
        const rosters: SleeperRoster[] = await rosterRes.json();
        const myRoster = rosters.find(r => r.owner_id === userId);

        if (myRoster) {
          // Fetch Bracket
          const bracket = await SleeperService.getWinnersBracket(league.league_id);
          
          const { rank, madePlayoffs } = determineFinalRank(myRoster.roster_id, rosters, bracket, league);

          setResults(prev => prev.map(r => r.leagueId === league.league_id ? { 
            ...r, 
            status: 'complete',
            rank,
            madePlayoffs,
            rosterId: myRoster.roster_id,
            pointsFor: myRoster.settings.fpts
          } : r));
        } else {
           setResults(prev => prev.map(r => r.leagueId === league.league_id ? { ...r, status: 'error' } : r));
        }

      } catch (e) {
        setResults(prev => prev.map(r => r.leagueId === league.league_id ? { ...r, status: 'error' } : r));
      }

      completed++;
      setProgress((completed / total) * 100);
      await new Promise(r => setTimeout(r, 200)); 
    }
    setAnalyzing(false);
  };

  // Stats
  const completedResults = results.filter(r => r.status === 'complete');
  const avgFinish = completedResults.length > 0 
    ? completedResults.reduce((s, r) => s + r.rank, 0) / completedResults.length 
    : 0;
  const championships = completedResults.filter(r => r.rank === 1).length;
  const podiums = completedResults.filter(r => r.rank <= 3).length;
  const playoffRate = completedResults.length > 0 
    ? (completedResults.filter(r => r.madePlayoffs).length / completedResults.length) * 100 
    : 0;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Season Performance Analyzer
      </Typography>
      
      {/* Input */}
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
            disabled={analyzing || loadingUser}
          />
          <FormControl sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select value={year} label="Year" onChange={(e) => setYear(e.target.value)} disabled={analyzing}>
              {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <Button 
            variant="contained" 
            size="large" 
            onClick={handleStart}
            disabled={loadingUser || !username}
            sx={{ height: 56 }}
          >
            {loadingUser ? 'Fetching...' : 'Analyze Season'}
          </Button>
        </Box>
        {analyzing && <LinearProgress variant="determinate" value={progress} sx={{ mt: 3 }} />}
      </Paper>

      {completedResults.length > 0 && (
        <>
          {/* Summary Card */}
          <Card sx={{ mb: 4, bgcolor: 'secondary.dark', color: 'white' }}>
            <CardContent>
              <Grid container spacing={4} textAlign="center">
                <Grid item xs={6} md={3}>
                  <Typography variant="h6" color="secondary.light">Avg Finish</Typography>
                  <Typography variant="h3" fontWeight="bold">{avgFinish.toFixed(1)}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="h6" color="secondary.light">Golds 🥇</Typography>
                  <Typography variant="h3" fontWeight="bold">{championships}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="h6" color="secondary.light">Podiums 🏆</Typography>
                  <Typography variant="h3" fontWeight="bold">{podiums}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="h6" color="secondary.light">Playoffs</Typography>
                  <Typography variant="h3" fontWeight="bold">{playoffRate.toFixed(0)}%</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* League List */}
          <Grid container spacing={2}>
            {completedResults.sort((a, b) => a.rank - b.rank).map((league) => (
              <Grid item xs={12} sm={6} md={4} key={league.leagueId}>
                <Card sx={{ 
                  height: '100%', 
                  borderLeft: '6px solid', 
                  borderColor: league.rank === 1 ? 'gold' : league.rank <= 3 ? 'silver' : league.madePlayoffs ? 'success.main' : 'error.main'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar src={`https://sleepercdn.com/avatars/${league.avatar}`} sx={{ mr: 2 }} />
                      <Typography variant="subtitle1" fontWeight="bold" noWrap title={league.name}>
                        {league.name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Finish</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {getOrdinal(league.rank)}
                        </Typography>
                      </Box>
                      {league.rank === 1 && <EmojiEventsIcon sx={{ fontSize: 40, color: 'gold' }} />}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Container>
  );
}
