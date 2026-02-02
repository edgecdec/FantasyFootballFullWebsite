'use client';

import * as React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  LinearProgress,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useUser } from '@/context/UserContext';
import { SleeperService } from '@/services/sleeper/sleeperService';
import { analyzePositionalBenchmarks, LeagueBenchmarkResult, PositionStats } from '@/services/stats/positionalBenchmarks';
import PageHeader from '@/components/common/PageHeader';
import UserSearchInput from '@/components/common/UserSearchInput';

// Constants
const MIN_YEAR = 2017;
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const COLORS: Record<string, string> = {
  QB: '#ef5350',
  RB: '#66bb6a',
  WR: '#42a5f5',
  TE: '#ffa726',
  K: '#ab47bc',
  DEF: '#8d6e63'
};

type YearlyPositionalStats = {
  year: string;
  // Dynamic keys: "QB_User", "QB_Avg", etc.
  [key: string]: string | number;
};

export default function PositionalHistoryPage() {
  const router = useRouter();
  const { user, fetchUser } = useUser();
  const [username, setUsername] = React.useState('');
  
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState('');
  const [data, setData] = React.useState<YearlyPositionalStats[]>([]);

  // Toggles
  const [metric, setMetric] = React.useState<'total' | 'efficiency'>('total');
  const [positionFilter, setPositionFilter] = React.useState<string>('ALL');

  // Init
  React.useEffect(() => {
    if (user) {
      setUsername(user.username);
    } else {
      const saved = localStorage.getItem('sleeper_usernames');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) setUsername(parsed[0]);
        } catch (e) {}
      }
    }
  }, [user]);

  const handleAnalyze = async () => {
    if (!username) return;
    setLoading(true);
    setProgress(0);
    setData([]);
    setStatus('Initializing...');

    try {
      let currentUser = user;
      if (!currentUser || currentUser.username.toLowerCase() !== username.toLowerCase()) {
        currentUser = await SleeperService.getUser(username);
        if (!currentUser) throw new Error('User not found');
        fetchUser(username);
      }

      const results: YearlyPositionalStats[] = [];
      
      const now = new Date();
      let currentYear = now.getMonth() < 5 ? now.getFullYear() - 1 : now.getFullYear();
      let processedYears = 0;
      const EST_TOTAL_YEARS = 6;

      while (currentYear >= MIN_YEAR) {
        const year = currentYear.toString();
        setStatus(`Scanning ${year}...`);

        try {
          const leagues = await SleeperService.getLeagues(currentUser.user_id, year);
          const activeLeagues = leagues.filter(l => !SleeperService.shouldIgnoreLeague(l));

          if (activeLeagues.length === 0) {
             currentYear--;
             processedYears++;
             setProgress(Math.min((processedYears / EST_TOTAL_YEARS) * 100, 95));
             continue;
          }

          // Aggregators for this year
          const yearUserSums: Record<string, number> = {};
          const yearAvgSums: Record<string, number> = {};
          const yearCounts: Record<string, number> = {};

          POSITIONS.forEach(p => {
            yearUserSums[p] = 0;
            yearAvgSums[p] = 0;
            yearCounts[p] = 0;
          });

          // Process Leagues Sequentially to manage rate limit
          const CHUNK_SIZE = 3;
          for (let j = 0; j < activeLeagues.length; j += CHUNK_SIZE) {
             const chunk = activeLeagues.slice(j, j + CHUNK_SIZE);
             await Promise.all(chunk.map(async (league) => {
                 try {
                     const res = await analyzePositionalBenchmarks(league, currentUser!.user_id);
                     
                     POSITIONS.forEach(p => {
                       const uStat = res.userStats[p];
                       const lStat = res.leagueAverageStats[p];
                       
                       // Only count valid data points
                       if (uStat && lStat) {
                         // We will aggregate raw per-week averages, then average those
                         // Alternatively, we could sum raw points and divide later. 
                         // Averaging the averages is acceptable here as "Average Performance per League"
                         yearUserSums[p] += uStat.avgPointsPerWeek; 
                         yearAvgSums[p] += lStat.avgPointsPerWeek;
                         
                         // Store efficiency data in separate map? Or reuse logic?
                         // Let's store raw points for now, efficiency is harder to agg post-hoc.
                         // Actually, we need to store BOTH sets if we want to toggle instantly without re-fetching.
                         // Let's create a rich data structure.
                       }
                     });
                 } catch (e) {
                     console.warn(`Failed ${league.name}`, e);
                 }
             }));
          }
          
          // Wait, I need to store data in a way that supports the toggle.
          // The loop above only captured "Total Output".
          // I should capture everything.
          
          // Let's rebuild the aggregator logic inside the loop properly.
          const agg = {
             total: { user: {} as Record<string, number>, avg: {} as Record<string, number> },
             efficiency: { user: {} as Record<string, number>, avg: {} as Record<string, number> },
             count: {} as Record<string, number>
          };
          POSITIONS.forEach(p => {
             agg.total.user[p] = 0; agg.total.avg[p] = 0;
             agg.efficiency.user[p] = 0; agg.efficiency.avg[p] = 0;
             agg.count[p] = 0;
          });

          for (let j = 0; j < activeLeagues.length; j += CHUNK_SIZE) {
             const chunk = activeLeagues.slice(j, j + CHUNK_SIZE);
             await Promise.all(chunk.map(async (league) => {
                 try {
                     const res = await analyzePositionalBenchmarks(league, currentUser!.user_id);
                     POSITIONS.forEach(p => {
                       const u = res.userStats[p];
                       const l = res.leagueAverageStats[p];
                       if (u && l) {
                         agg.total.user[p] += u.avgPointsPerWeek;
                         agg.total.avg[p] += l.avgPointsPerWeek;
                         
                         agg.efficiency.user[p] += u.avgPointsPerStarter;
                         agg.efficiency.avg[p] += l.avgPointsPerStarter;
                         
                         agg.count[p]++;
                       }
                     });
                 } catch (e) {}
             }));
          }

          // Build Year Data Point
          const point: YearlyPositionalStats = { year };
          POSITIONS.forEach(p => {
             const c = agg.count[p] || 1;
             // Total
             point[`${p}_User_total`] = agg.total.user[p] / c;
             point[`${p}_Avg_total`] = agg.total.avg[p] / c;
             // Efficiency
             point[`${p}_User_efficiency`] = agg.efficiency.user[p] / c;
             point[`${p}_Avg_efficiency`] = agg.efficiency.avg[p] / c;
          });
          
          results.push(point);

        } catch (e) {
          console.error(e);
        }

        const sorted = [...results].sort((a, b) => a.year.localeCompare(b.year));
        setData(sorted);
        
        currentYear--;
        processedYears++;
        setProgress(Math.min((processedYears / EST_TOTAL_YEARS) * 100, 99));
      }

    } catch (e) {
      console.error(e);
      setStatus('Error');
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => router.back()} 
        sx={{ mb: 2 }}
      >
        Back to Benchmarks
      </Button>

      <PageHeader 
        title="Positional History" 
        subtitle="Track your roster construction and drafting tendencies over time."
      />

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
          <UserSearchInput username={username} setUsername={setUsername} disabled={loading} />
          <Button 
            variant="contained" 
            size="large"
            onClick={handleAnalyze}
            disabled={loading || !username}
            sx={{ height: 56 }}
          >
            {loading ? 'Scanning...' : 'Generate History'}
          </Button>
        </Box>
        {loading && <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />}
        
        {/* Controls */}
        {data.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" display="block" color="text.secondary" gutterBottom>Metric</Typography>
              <ToggleButtonGroup
                value={metric}
                exclusive
                onChange={(_, v) => v && setMetric(v)}
                size="small"
              >
                <ToggleButton value="total">Total Output</ToggleButton>
                <ToggleButton value="efficiency">Efficiency</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="caption" display="block" color="text.secondary" gutterBottom>Filter Position</Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Positions</MenuItem>
                  {POSITIONS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}
      </Paper>

      {data.length > 0 && (
        <Paper sx={{ p: 3, height: 600 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="year" stroke="#888" />
              <YAxis 
                stroke="#888" 
                label={{ 
                  value: metric === 'total' ? 'Avg Weekly Pts' : 'Pts Per Start', 
                  angle: -90, 
                  position: 'insideLeft' 
                }} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#333', border: 'none' }}
                labelStyle={{ color: '#aaa' }}
                formatter={(val: any) => Number(val).toFixed(1)}
              />
              <Legend />
              
              {POSITIONS.map(pos => {
                if (positionFilter !== 'ALL' && positionFilter !== pos) return null;
                
                return (
                  <React.Fragment key={pos}>
                    {/* User Line */}
                    <Line
                      type="monotone"
                      dataKey={`${pos}_User_${metric}`}
                      name={positionFilter === 'ALL' ? pos : `${pos} (You)`}
                      stroke={COLORS[pos]}
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                    
                    {/* League Avg Line (Dotted) - Only show if filtering by single position to avoid clutter */}
                    {positionFilter === pos && (
                      <Line
                        type="monotone"
                        dataKey={`${pos}_Avg_${metric}`}
                        name="League Avg"
                        stroke="#999"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Container>
  );
}
