'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  LinearProgress,
  Grid,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useUser } from '@/context/UserContext';
import { SleeperService, SleeperLeague } from '@/services/sleeper/sleeperService';
import { analyzePositionalBenchmarks, LeagueBenchmarkResult, PositionStats } from '@/services/stats/positionalBenchmarks';
import PageHeader from '@/components/common/PageHeader';
import SkillProfileChart, { AggregatePositionStats } from '@/components/performance/SkillProfileChart';
import PlayerImpactList, { PlayerImpact } from '@/components/performance/PlayerImpactList';

const VALID_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

export default function LeaguePositionalPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  
  const leagueId = params.leagueId as string;
  
  const [league, setLeague] = React.useState<SleeperLeague | null>(null);
  const [mode, setMode] = React.useState<'current' | 'history'>('current');
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  
  const [aggData, setAggData] = React.useState<AggregatePositionStats[]>([]);
  const [impacts, setImpacts] = React.useState<PlayerImpact[]>([]);
  const [metric, setMetric] = React.useState<'total' | 'efficiency'>('efficiency');

  React.useEffect(() => {
    if (leagueId) fetchLeagueInfo();
  }, [leagueId]);

  React.useEffect(() => {
    if (league && user) {
      runAnalysis();
    }
  }, [league, mode, user]);

  const fetchLeagueInfo = async () => {
    // We need to fetch the specific league first to get its details
    // Sleeper API doesn't have a direct "get league by ID" that is public easily without context?
    // Actually SleeperService.getLeagueHistory uses `fetch(BASE_URL/league/id)`.
    // I can assume I can fetch it.
    try {
      const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
      if (res.ok) {
        const data = await res.json();
        setLeague(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runAnalysis = async () => {
    if (!league || !user) return;
    setLoading(true);
    setProgress(0);
    setStatus('Initializing...');

    try {
      let leaguesToAnalyze: SleeperLeague[] = [];

      if (mode === 'current') {
        leaguesToAnalyze = [league];
      } else {
        setStatus('Tracing league history...');
        leaguesToAnalyze = await SleeperService.getLeagueHistory(league.league_id);
      }

      const results: LeagueBenchmarkResult[] = [];
      const total = leaguesToAnalyze.length;

      for (let i = 0; i < total; i++) {
        const l = leaguesToAnalyze[i];
        setStatus(`Analyzing ${l.season}...`);
        try {
          // Check if user was in this league season
          // We can check rosters or just try analyze and catch error
          const res = await analyzePositionalBenchmarks(l, user.user_id, true); // Include playoffs
          results.push(res);
        } catch (e) {
          // User probably wasn't in the league this year
          console.log(`Skipping ${l.season} - User not found`);
        }
        setProgress(((i + 1) / total) * 100);
      }

      aggregateResults(results);

    } catch (e) {
      console.error(e);
      setStatus('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const aggregateResults = (results: LeagueBenchmarkResult[]) => {
    if (results.length === 0) {
      setAggData([]);
      setImpacts([]);
      return;
    }

    // 1. Aggregate Skill Profile (Weighted Average)
    const sums = {
      user: {} as Record<string, PositionStats>,
      league: {} as Record<string, PositionStats>
    };

    // Init
    VALID_POSITIONS.forEach(pos => {
      sums.user[pos] = { position: pos, totalPoints: 0, starterCount: 0, gamesPlayed: 0, avgPointsPerWeek: 0, avgPointsPerStarter: 0 };
      sums.league[pos] = { position: pos, totalPoints: 0, starterCount: 0, gamesPlayed: 0, avgPointsPerWeek: 0, avgPointsPerStarter: 0 };
    });

    results.forEach(res => {
      VALID_POSITIONS.forEach(pos => {
        const u = res.userStats[pos];
        const l = res.leagueAverageStats[pos];

        if (u && l) {
          // Sum totals
          sums.user[pos].totalPoints += u.totalPoints;
          sums.user[pos].starterCount += u.starterCount;
          sums.user[pos].gamesPlayed += u.gamesPlayed;

          sums.league[pos].totalPoints += l.totalPoints;
          sums.league[pos].starterCount += l.starterCount;
          sums.league[pos].gamesPlayed += l.gamesPlayed;
        }
      });
    });

    const chartData: AggregatePositionStats[] = VALID_POSITIONS.map(pos => {
      const u = sums.user[pos];
      const l = sums.league[pos];

      // Recompute averages based on accumulated totals
      const avgUserPoints = u.gamesPlayed > 0 ? u.totalPoints / u.gamesPlayed : 0;
      const avgLeaguePoints = l.gamesPlayed > 0 ? l.totalPoints / l.gamesPlayed : 0;
      
      const avgUserEff = u.starterCount > 0 ? u.totalPoints / u.starterCount : 0;
      const avgLeagueEff = l.starterCount > 0 ? l.totalPoints / l.starterCount : 0;

      const diffPoints = avgUserPoints - avgLeaguePoints;
      const diffPct = avgLeaguePoints > 0 ? (diffPoints / avgLeaguePoints) * 100 : 0;

      const diffEff = avgUserEff - avgLeagueEff;
      const diffEffPct = avgLeagueEff > 0 ? (diffEff / avgLeagueEff) * 100 : 0;

      return {
        position: pos,
        avgUserPoints,
        avgLeaguePoints,
        diffPoints,
        diffPct,
        avgUserEff,
        avgLeagueEff,
        diffEff,
        diffEffPct
      };
    });

    setAggData(chartData);

    // 2. Aggregate Player Impacts
    const impactMap = new Map<string, { totalPOLA: number, weeks: number, name: string, pos: string }>();
    
    results.forEach(res => {
      res.playerImpacts.forEach(p => {
        const curr = impactMap.get(p.playerId) || { totalPOLA: 0, weeks: 0, name: p.name, pos: p.position };
        curr.totalPOLA += p.totalPOLA;
        curr.weeks += (p.weeksStarted || 0);
        impactMap.set(p.playerId, curr);
      });
    });

    const impactList: PlayerImpact[] = Array.from(impactMap.entries()).map(([id, val]) => ({
      playerId: id,
      name: val.name,
      position: val.pos,
      totalPOLA: val.totalPOLA,
      weeks: val.weeks,
      avgPOLA: val.totalPOLA / (val.weeks || 1)
    })).sort((a, b) => b.totalPOLA - a.totalPOLA);

    setImpacts(impactList);
  };

  if (!league) return <LinearProgress />;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>
        Back to Dashboard
      </Button>

      <PageHeader 
        title={league.name}
        subtitle={`Positional Analysis • ${mode === 'current' ? league.season : 'All-Time History'}`}
        action={
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
            color="primary"
          >
            <ToggleButton value="current">{league.season} Only</ToggleButton>
            <ToggleButton value="history">All-Time History</ToggleButton>
          </ToggleButtonGroup>
        }
      />

      {loading && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" gutterBottom>{status} ({Math.round(progress)}%)</Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {!loading && aggData.length === 0 && (
        <Alert severity="info">No data found for this configuration.</Alert>
      )}

      {!loading && aggData.length > 0 && (
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SkillProfileChart 
              data={aggData} 
              metric={metric} 
              onMetricChange={setMetric} 
              height={500}
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <PlayerImpactList 
              impacts={impacts} 
              maxItems={8} // Show more since it's a detail page
              title={mode === 'current' ? "Season Impact" : "All-Time Legends & Busts"}
            />
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
