import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Sort as SortIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
  CalendarToday as DateIcon,
  AttachMoney as PriceIcon,
  Title as TitleIcon,
} from '@mui/icons-material';
import type { SortProps, ListingsSortOptions } from '../../types/listings';

/**
 * Sort component for listings with multiple sort options and direction toggle
 * 
 * @param props - Component props including current sort value and change handler
 */
export const Sort: React.FC<SortProps> = ({
  value,
  onChange,
  loading = false,
}) => {
  // Sort options configuration
  const sortOptions = [
    {
      value: 'date',
      label: 'Date',
      icon: <DateIcon sx={{ fontSize: 18 }} />,
      description: 'Sort by creation date',
    },
    {
      value: 'price',
      label: 'Price',
      icon: <PriceIcon sx={{ fontSize: 18 }} />,
      description: 'Sort by price',
    },
    {
      value: 'title',
      label: 'Title',
      icon: <TitleIcon sx={{ fontSize: 18 }} />,
      description: 'Sort alphabetically by title',
    },
    {
      value: 'createdAt',
      label: 'Created At',
      icon: <DateIcon sx={{ fontSize: 18 }} />,
      description: 'Sort by creation time',
    },
  ];

  // Direction options
  const directionOptions = [
    {
      value: 'desc',
      label: 'Descending',
      icon: <DescIcon sx={{ fontSize: 18 }} />,
      description: value.sortBy === 'date' || value.sortBy === 'createdAt' 
        ? 'Newest first' 
        : 'Highest first',
    },
    {
      value: 'asc',
      label: 'Ascending',
      icon: <AscIcon sx={{ fontSize: 18 }} />,
      description: value.sortBy === 'date' || value.sortBy === 'createdAt' 
        ? 'Oldest first' 
        : 'Lowest first',
    },
  ];

  // Handle sort field change
  const handleSortByChange = (newSortBy: ListingsSortOptions['sortBy']) => {
    // Adjust default direction based on sort field
    let newDirection = value.sortOrder;
    if (newSortBy === 'date' || newSortBy === 'createdAt') {
      newDirection = 'desc'; // Default to newest first for date fields
    } else if (newSortBy === 'price') {
      newDirection = 'asc'; // Default to lowest first for price
    }
    
    onChange({
      sortBy: newSortBy,
      sortOrder: newDirection,
    });
  };

  // Handle sort direction change
  const handleDirectionChange = (_event: React.MouseEvent, newDirection: ListingsSortOptions['sortOrder']) => {
    if (newDirection) {
      onChange({
        sortBy: value.sortBy,
        sortOrder: newDirection,
      });
    }
  };

  // Get current sort option
  const currentSortOption = sortOptions.find(option => option.value === value.sortBy);

  // Get current direction option
  const currentDirectionOption = directionOptions.find(option => option.value === value.sortOrder);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
      {/* Sort icon */}
      <SortIcon color="primary" sx={{ mr: 1 }} />

      <Typography variant="subtitle2" sx={{ mr: 1, minWidth: 'fit-content' }}>
        Sort by:
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
        {/* Sort field selector */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort Field</InputLabel>
          <Select
            value={value.sortBy}
            label="Sort Field"
            onChange={(e) => handleSortByChange(e.target.value as ListingsSortOptions['sortBy'])}
            disabled={loading}
            startAdornment={currentSortOption?.icon}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {option.icon}
                  {option.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sort direction toggle */}
        <ToggleButtonGroup
          value={value.sortOrder}
          exclusive
          onChange={handleDirectionChange}
          size="small"
          disabled={loading}
          sx={{
            '& .MuiToggleButton-root': {
              border: '1px solid',
              borderColor: 'divider',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            },
          }}
        >
          {directionOptions.map((option) => (
            <Tooltip key={option.value} title={option.description}>
              <ToggleButton value={option.value} size="small">
                {option.icon}
                <Typography variant="caption" sx={{ ml: 0.5, display: { xs: 'none', sm: 'block' } }}>
                  {option.label}
                </Typography>
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>

        {/* Current sort display */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto', minWidth: 200 }}>
          {currentSortOption?.icon}
          <Typography variant="body2" color="text.secondary">
            {currentSortOption?.label} {currentDirectionOption?.description}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default Sort;