'use client';

import * as React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Box,
  Chip,
  SelectChangeEvent,
  ListSubheader,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
  autoFocus: false
};

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
  
  const [searchText, setSearchText] = React.useState('');

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value: newValue },
    } = event;
    
    // Check if the click came from the search input (MUI quirk)
    // Actually, MUI Select handles values. We just need to ensure we don't accidentally select the search text.
    onChange(typeof newValue === 'string' ? newValue.split(',') : newValue);
  };

  // Filter options based on search text
  const filteredOptions = React.useMemo(() => {
    if (!searchText) return options;
    return options.filter(opt => opt.toLowerCase().includes(searchText.toLowerCase()));
  }, [options, searchText]);

  // Handle keys to stop propagation so typing doesn't close menu or trigger select shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <FormControl size="small" sx={{ minWidth, maxWidth }}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={handleChange}
        input={<OutlinedInput label={label} />}
        onClose={() => setSearchText('')} // Reset search on close
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((val) => (
              <Chip key={val} label={val} size="small" />
            ))}
          </Box>
        )}
        MenuProps={MenuProps}
      >
        <ListSubheader>
          <TextField
            size="small"
            autoFocus
            placeholder="Search..."
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()} // Prevent select close
          />
        </ListSubheader>
        
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No results found</MenuItem>
        )}
      </Select>
    </FormControl>
  );
}