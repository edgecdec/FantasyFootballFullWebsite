'use client';

import * as React from 'react';
import { Tooltip, Box } from '@mui/material';

type StartsTooltipProps = {
  weeksStarted?: number;
  startedWeeks?: Record<string, number[]>;
};

export const formatWeeks = (weeks?: Record<string, number[]>) => {
  if (!weeks || Object.keys(weeks).length === 0) return 'No weekly data';
  return Object.entries(weeks)
    .sort(([a], [b]) => b.localeCompare(a)) // Newest year first
    .map(([year, w]) => `${year}: Week ${w.sort((a, b) => a - b).join(', ')}`)
    .join('\n');
};

export default function StartsTooltip({ weeksStarted, startedWeeks }: StartsTooltipProps) {
  return (
    <Tooltip 
      title={<div style={{ whiteSpace: 'pre-line' }}>{formatWeeks(startedWeeks)}</div>} 
      arrow 
      placement="top"
    >
      <Box 
        component="span" 
        sx={{ 
          cursor: 'help', 
          borderBottom: '1px dotted #999',
          display: 'inline-block'
        }}
      >
        {weeksStarted || 0} starts
      </Box>
    </Tooltip>
  );
}
