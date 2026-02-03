'use client';

import * as React from 'react';
import {
  Paper,
  Box,
  Typography,
  Divider,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';

export type AggregatePositionStats = {
  position: string;
  avgUserPoints: number;
  avgLeaguePoints: number;
  diffPoints: number;
  diffPct: number;
  avgUserEff: number;
  avgLeagueEff: number;
  diffEff: number;
  diffEffPct: number;
};

type Props = {
  data: AggregatePositionStats[];
  metric: 'total' | 'efficiency';
  onMetricChange: (m: 'total' | 'efficiency') => void;
  height?: number;
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, metric }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AggregatePositionStats;
    const isTotal = metric === 'total';
    
    const userVal = isTotal ? data.avgUserPoints : data.avgUserEff;
    const leagueVal = isTotal ? data.avgLeaguePoints : data.avgLeagueEff;
    const diffVal = isTotal ? data.diffPoints : data.diffEff;
    const diffPct = isTotal ? data.diffPct : data.diffEffPct;
    const unit = isTotal ? 'pts/wk' : 'pts/start';

    return (
      <Paper sx={{ p: 2, bgcolor: 'rgba(20, 20, 20, 0.95)', border: '1px solid #333', minWidth: 200 }}>
        <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontWeight: 'bold' }}>
          {data.position} ({isTotal ? 'Output' : 'Efficiency'})
        </Typography>
        
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#aaa' }}>Your Avg:</Typography>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>{userVal.toFixed(1)} {unit}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#aaa' }}>League Avg:</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>{leagueVal.toFixed(1)} {unit}</Typography>
          </Box>
        </Box>
        
        <Divider sx={{ my: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: '#aaa' }}>Difference:</Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" sx={{ color: diffVal > 0 ? '#66bb6a' : '#ef5350', fontWeight: 'bold' }}>
              {diffVal > 0 ? '+' : ''}{diffVal.toFixed(1)}
            </Typography>
            <Typography variant="caption" sx={{ color: diffVal > 0 ? '#66bb6a' : '#ef5350' }}>
              ({diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%)
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }
  return null;
};

export default function SkillProfileChart({ data, metric, onMetricChange, height = 400 }: Props) {
  return (
    <Paper sx={{ p: 3, height: '100%', bgcolor: '#1e293b' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
            <Typography variant="h5" gutterBottom color="white">Skill Profile</Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
                {metric === 'total' ? 'Scoring Surplus/Deficit vs League Avg' : 'Efficiency (Points per Start) vs League Avg'}
            </Typography>
        </Box>
        
        <ToggleButtonGroup
            value={metric}
            exclusive
            onChange={(_, v) => v && onMetricChange(v)}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
        >
            <ToggleButton value="total" sx={{ color: 'white', '&.Mui-selected': { bgcolor: 'primary.main', color: 'white' } }}>
                Total Output
            </ToggleButton>
            <ToggleButton value="efficiency" sx={{ color: 'white', '&.Mui-selected': { bgcolor: 'primary.main', color: 'white' } }}>
                Efficiency
            </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box sx={{ height, width: '100%' }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
            <XAxis type="number" stroke="#888" unit="%" />
            <YAxis dataKey="position" type="category" stroke="#fff" width={50} />
            <Tooltip content={<CustomTooltip metric={metric} />} />
            <ReferenceLine x={0} stroke="#fff" />
            <Bar dataKey={metric === 'total' ? 'diffPct' : 'diffEffPct'} name="% Diff">
              {data.map((entry, index) => {
                const val = metric === 'total' ? entry.diffPct : entry.diffEffPct;
                return <Cell key={`cell-${index}`} fill={val > 0 ? '#66bb6a' : '#ef5350'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
