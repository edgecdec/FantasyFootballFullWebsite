'use client';

import * as React from 'react';
import {
  Container,
  Box,
  Typography,
  LinearProgress,
  FormControlLabel,
  Switch,
  Paper,
  Button
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
import { useParams, useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { SleeperService } from '@/services/sleeper/sleeperService';
import { analyzeLeague } from '@/services/stats/expectedWins';
import PageHeader from '@/components/common/PageHeader';

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d0ed57', 
  '#a4de6c', '#8dd1e1', '#83a6ed', '#8e4585', '#ff0000',
  '#0088fe', '#00c49f'
];

type RawHistoryPoint = {
  year: number;
  data: Record<string, { actual: number; expected: number }>;
};

type OwnerMeta = {
  id: string;
  name: string;
  teamName?: string;
};

type Averages = {
  ownerId: string;
  avgExpected: number;
  avgActual: number;
  avgPointsFor: number;
  avgPointsAgainst: number;
  totalLuck: number;
  avgLuck: number;
  avgExpectedAboveAvg: number;
  yearsCount: number;
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, owners }: any) => {
  if (active && payload && payload.length) {
    // Sort payload by value descending
    const sorted = [...payload].sort((a: any, b: any) => b.value - a.value);

    return (
      <Paper sx={{ p: 1.5, bgcolor: 'rgba(20, 20, 20, 0.95)', border: '1px solid #333' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: '#fff' }}>Season {label}</Typography>
        {sorted.map((entry: any) => {
           const owner = owners.find((o: OwnerMeta) => o.id === entry.dataKey);
           const displayName = owner?.name || entry.dataKey;
           const teamName = owner?.teamName;
           
           return (
             <Box key={entry.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 0.5 }}>
               <Box>
                 <Typography variant="caption" display="block" sx={{ color: entry.color, fontWeight: 'bold' }}>{displayName}</Typography>
                 {teamName && <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>{teamName}</Typography>}
               </Box>
               <Typography variant="caption" sx={{ color: '#fff', fontWeight: 'bold' }}>{Number(entry.value).toFixed(2)}</Typography>
             </Box>
           );
        })}
      </Paper>
    );
  }
  return null;
};

export default function LeagueHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const currentLeagueId = params.leagueId as string;

  const [loading, setLoading] = React.useState(true);
  const [progress, setProgress] = React.useState(0);
  const [rawData, setRawData] = React.useState<RawHistoryPoint[]>([]);
  const [owners, setOwners] = React.useState<OwnerMeta[]>([]);
  const [mode, setMode] = React.useState<'expected' | 'actual'>('expected');
  const [status, setStatus] = React.useState('');
  const [averages, setAverages] = React.useState<Averages[]>([]);

  React.useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setProgress(0);
      setStatus('Tracing league lineage...');
      
      try {
        const history = await SleeperService.getLeagueHistory(currentLeagueId);
        const total = history.length;
        const results: RawHistoryPoint[] = [];
        const ownerInfoMap = new Map<string, { name: string, teamName?: string }>(); 
        const ownerStatsMap = new Map<string, { sumExp: number; sumAct: number; sumPF: number; sumPA: number; count: number }>();

        for (let i = 0; i < total; i++) {
          const league = history[i];
          const season = parseInt(league.season);
          setStatus(`Analyzing ${season}...`);
          
          try {
            const stats = await analyzeLeague(league);
            const point: RawHistoryPoint = { year: season, data: {} };
            
            stats.standings.forEach(team => {
              // Update owner info (prefer latest)
              if (!ownerInfoMap.has(team.ownerId)) {
                ownerInfoMap.set(team.ownerId, { name: team.name, teamName: team.teamName });
              }
              // If we are processing chronologically (oldest to newest would be better for "latest name"),
              // but history is usually newest to oldest?
              // `getLeagueHistory` returns history chain. Usually starting from current.
              // So the first one we see IS the latest.
              // So `!has` check is correct to keep latest.
              
              point.data[team.ownerId] = {
                actual: team.actualWins,
                expected: team.expectedWins
              };

              // Aggregate for averages
              const curr = ownerStatsMap.get(team.ownerId) || { sumExp: 0, sumAct: 0, sumPF: 0, sumPA: 0, count: 0 };
              curr.sumExp += team.expectedWins;
              curr.sumAct += team.actualWins;
              curr.sumPF += team.pointsFor;
              curr.sumPA += team.pointsAgainst;
              curr.count++;
              ownerStatsMap.set(team.ownerId, curr);
            });
            results.push(point);
            
          } catch (e) {
            console.error(`Failed to analyze season ${season}`, e);
          }
          
          if (mounted) setProgress(((i + 1) / total) * 100);
        }

        if (mounted) {
          results.sort((a, b) => a.year - b.year);
          setRawData(results);
          
          const uniqueOwners = Array.from(ownerInfoMap.entries()).map(([id, info]) => ({ id, ...info }));
          setOwners(uniqueOwners);

          const avgList: Averages[] = [];
          
          // Calculate Global Average Expected Wins per Season (Baseline)
          let globalTotalExpected = 0;
          let globalTotalSeasons = 0;
          ownerStatsMap.forEach((val) => {
              globalTotalExpected += val.sumExp;
              globalTotalSeasons += val.count;
          });
          const leagueBaselineExp = globalTotalSeasons > 0 ? globalTotalExpected / globalTotalSeasons : 0;

          ownerStatsMap.forEach((val, key) => {
              const totalLuck = val.sumAct - val.sumExp;
              const avgExpected = val.sumExp / val.count;
              
              avgList.push({
                  ownerId: key,
                  avgExpected,
                  avgActual: val.sumAct / val.count,
                  avgPointsFor: val.sumPF / val.count,
                  avgPointsAgainst: val.sumPA / val.count,
                  totalLuck,
                  avgLuck: totalLuck / val.count,
                  avgExpectedAboveAvg: avgExpected - leagueBaselineExp,
                  yearsCount: val.count
              });
          });
          // Sort averages by expected wins desc
          avgList.sort((a, b) => b.avgExpected - a.avgExpected);
          setAverages(avgList);
        }

      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (currentLeagueId) fetchData();

    return () => { mounted = false; };
  }, [currentLeagueId]);

  const chartData = React.useMemo(() => {
    return rawData.map(pt => {
        const row: any = { year: pt.year };
        Object.entries(pt.data).forEach(([ownerId, stats]) => {
            row[ownerId] = mode === 'expected' ? stats.expected : stats.actual;
        });
        return row;
    });
  }, [rawData, mode]);
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => router.back()} 
        sx={{ mb: 2 }}
      >
        Back to Analysis
      </Button>

      <PageHeader 
        title="League History Analysis" 
        subtitle="Visualize expected wins and performance trends across all league seasons."
      />

      <Paper sx={{ p: 3, mb: 4 }}>
        {loading ? (
          <Box sx={{ width: '100%', py: 4 }}>
            <Typography align="center" gutterBottom>{status} ({Math.round(progress)}%)</Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        ) : (
          <Box>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                control={<Switch checked={mode === 'expected'} onChange={() => setMode(m => m === 'expected' ? 'actual' : 'expected')} />}
                label={mode === 'expected' ? "Show Expected Wins" : "Show Actual Wins"}
                />
            </Box>

            <Box sx={{ height: 600, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="year" stroke="#888" />
                    <YAxis label={{ value: 'Wins', angle: -90, position: 'insideLeft' }} stroke="#888" />
                    <Tooltip content={<CustomTooltip owners={owners} />} />
                    <Legend formatter={(value) => owners.find(o => o.id === value)?.name || value} />
                    {owners.map((owner, i) => (
                    <Line
                        key={owner.id}
                        type="monotone"
                        dataKey={owner.id}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        connectNulls
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    ))}
                </LineChart>
                </ResponsiveContainer>
            </Box>
          </Box>
        )}
      </Paper>

      {!loading && averages.length > 0 && (
          <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Historical Averages</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                  {averages.map((avg) => (
                      <Paper key={avg.ownerId} variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" noWrap fontWeight="bold">
                              {owners.find(o => o.id === avg.ownerId)?.name || avg.ownerId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                              {avg.yearsCount} Seasons
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, rowGap: 2 }}>
                              <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">Avg Exp</Typography>
                                  <Typography variant="body2" color="primary.main" fontWeight="bold">
                                      {avg.avgExpected.toFixed(2)}
                                  </Typography>
                              </Box>
                              <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">Avg Actual</Typography>
                                  <Typography variant="body2">
                                      {avg.avgActual.toFixed(2)}
                                  </Typography>
                              </Box>
                              
                              <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">Avg PF</Typography>
                                  <Typography variant="body2" fontWeight="medium">
                                      {avg.avgPointsFor.toFixed(0)}
                                  </Typography>
                              </Box>
                              <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">Avg PA</Typography>
                                  <Typography variant="body2">
                                      {avg.avgPointsAgainst.toFixed(0)}
                                  </Typography>
                              </Box>

                              <Box sx={{ gridColumn: 'span 2', pt: 1, borderTop: '1px dashed #444', display: 'flex', justifyContent: 'space-between' }}>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">Avg Luck</Typography>
                                    <Typography 
                                        variant="body2" 
                                        fontWeight="bold"
                                        sx={{ color: avg.avgLuck > 0 ? 'success.main' : 'error.main' }}
                                    >
                                        {avg.avgLuck > 0 ? '+' : ''}{avg.avgLuck.toFixed(2)}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" color="text.secondary" display="block">Exp &gt; Avg</Typography>
                                    <Typography 
                                        variant="body2" 
                                        fontWeight="bold"
                                        sx={{ color: avg.avgExpectedAboveAvg > 0 ? 'success.main' : 'error.main' }}
                                    >
                                        {avg.avgExpectedAboveAvg > 0 ? '+' : ''}{avg.avgExpectedAboveAvg.toFixed(2)}
                                    </Typography>
                                  </Box>
                              </Box>
                          </Box>
                      </Paper>
                  ))}
              </Box>
          </Paper>
      )}
    </Container>
  );
}
