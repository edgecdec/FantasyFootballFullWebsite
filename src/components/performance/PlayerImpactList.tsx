'use client';

import * as React from 'react';
import { Paper, Box, Typography, Divider, Button } from '@mui/material';

export type PlayerImpact = {
  playerId: string;
  name: string;
  position: string;
  totalPOLA: number;
  weeksStarted?: number;
  weeks?: number; // Supports both naming conventions from different services
  avgPOLA: number;
};

type Props = {
  impacts: PlayerImpact[];
  title?: string;
  onViewAll?: () => void;
  maxItems?: number;
};

export default function PlayerImpactList({ 
  impacts, 
  title = "Player Impact", 
  onViewAll,
  maxItems = 4 
}: Props) {
  // Sort just in case
  const sorted = [...impacts].sort((a, b) => b.totalPOLA - a.totalPOLA);
  const carriers = sorted.slice(0, maxItems);
  const anchors = [...sorted].reverse().slice(0, maxItems);

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Players who gained/lost you the most points vs position average.
      </Typography>
      
      <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ mt: 2 }}>Top Contributors (Carriers)</Typography>
      {carriers.map((p) => (
        <Box key={p.playerId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, p: 1, borderLeft: '4px solid #66bb6a', bgcolor: 'background.default' }}>
          <Box>
            <Typography variant="body2" fontWeight="bold">{p.name}</Typography>
            <Typography variant="caption" color="text.secondary">{p.position} • {p.weeksStarted || p.weeks} starts</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" fontWeight="bold" color="#66bb6a">+{p.totalPOLA.toFixed(1)}</Typography>
            <Typography variant="caption" color="text.secondary">+{p.avgPOLA.toFixed(1)} / wk</Typography>
          </Box>
        </Box>
      ))}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" color="error.main" gutterBottom>Biggest Anchors</Typography>
      {anchors.map((p) => (
        <Box key={p.playerId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, p: 1, borderLeft: '4px solid #ef5350', bgcolor: 'background.default' }}>
          <Box>
            <Typography variant="body2" fontWeight="bold">{p.name}</Typography>
            <Typography variant="caption" color="text.secondary">{p.position} • {p.weeksStarted || p.weeks} starts</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" fontWeight="bold" color="#ef5350">{p.totalPOLA.toFixed(1)}</Typography>
            <Typography variant="caption" color="text.secondary">{p.avgPOLA.toFixed(1)} / wk</Typography>
          </Box>
        </Box>
      ))}
      
      {onViewAll && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="outlined" size="small" onClick={onViewAll}>
            View All Players
          </Button>
        </Box>
      )}
    </Paper>
  );
}
