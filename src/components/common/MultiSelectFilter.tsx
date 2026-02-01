'use client';

import * as React from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box
} from '@mui/material';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (newValue: string[]) => void;
  minWidth?: number;
  maxWidth?: number;
}

export default function MultiSelectFilter({ 
  label, 
  options, 
  value, 
  onChange,
  minWidth = 150,
  maxWidth = 300
}: MultiSelectFilterProps) {
  
  return (
    <Autocomplete
      multiple
      limitTags={2} // Show 2 chips then "+X"
      id={`filter-${label}`}
      options={options}
      value={value}
      onChange={(event, newValue) => {
        onChange(newValue);
      }}
      disableCloseOnSelect
      size="small"
      sx={{ minWidth, maxWidth }}
      renderInput={(params) => (
        <TextField 
          {...params} 
          label={label} 
          placeholder={value.length === 0 ? "Select..." : ""} 
        />
      )}
      renderTags={(tagValue, getTagProps) => {
        return tagValue.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option}
            label={option}
            size="small"
          />
        ));
      }}
    />
  );
}
