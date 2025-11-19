import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Check as ApplyIcon,
} from '@mui/icons-material';
import type {
  FiltersProps,
  ListingsFilters,
  CategoryOption,
  PriceRangeFilter,
  DateRangeFilter,
  ActiveFilter,
} from '../../types/listings';

/**
 * Comprehensive filters component for listings
 * Provides UI for status, category, price, date, and location filtering
 * 
 * @param props - Component props including current filters, callbacks, and options
 */
export const Filters: React.FC<FiltersProps> = ({
  filters,
  onChange,
  onClear,
  categories = [],
  loading = false,
  priceRange = { min: null, max: null, currency: '$' },
  dateRange = { from: null, to: null },
}) => {
  // Local state for form values
  const [localFilters, setLocalFilters] = useState<ListingsFilters>(filters);
  const [localPriceRange, setLocalPriceRange] = useState<PriceRangeFilter>(priceRange);
  const [localDateRange, setLocalDateRange] = useState<DateRangeFilter>(dateRange);

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'sold', label: 'Sold' },
    { value: 'expired', label: 'Expired' },
    { value: 'draft', label: 'Draft' },
  ];

  // Category options
  const categoryOptions: CategoryOption[] = [
    { value: 'all', label: 'All Categories' },
    ...categories,
    { value: 'Electronics', label: 'Electronics' },
    { value: 'Furniture', label: 'Furniture' },
    { value: 'Clothing', label: 'Clothing' },
    { value: 'Vehicles', label: 'Vehicles' },
    { value: 'Books', label: 'Books' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Home & Garden', label: 'Home & Garden' },
    { value: 'Other', label: 'Other' },
  ];

  // Condition options
  const conditionOptions = [
    { value: 'all', label: 'All Conditions' },
    { value: 'new', label: 'New' },
    { value: 'like-new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  // Sync with external changes
  // Note: Only sync when filters actually change, not on every prop reference change
  useEffect(() => {
    setLocalFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  // Generate active filters for display
  const generateActiveFilters = (): ActiveFilter[] => {
    const active: ActiveFilter[] = [];

    if (localFilters.status && localFilters.status !== 'all') {
      active.push({
        key: 'status',
        label: 'Status',
        value: localFilters.status,
        displayValue: statusOptions.find(opt => opt.value === localFilters.status)?.label || localFilters.status,
      });
    }

    if (localFilters.category && localFilters.category !== 'all') {
      active.push({
        key: 'category',
        label: 'Category',
        value: localFilters.category,
        displayValue: localFilters.category,
      });
    }

    if (localFilters.condition && localFilters.condition !== 'all') {
      active.push({
        key: 'condition',
        label: 'Condition',
        value: localFilters.condition,
        displayValue: conditionOptions.find(opt => opt.value === localFilters.condition)?.label || localFilters.condition,
      });
    }

    if (localFilters.minPrice !== undefined) {
      active.push({
        key: 'minPrice',
        label: 'Min Price',
        value: localFilters.minPrice,
        displayValue: `${priceRange.currency}${localFilters.minPrice.toLocaleString()}`,
      });
    }

    if (localFilters.maxPrice !== undefined) {
      active.push({
        key: 'maxPrice',
        label: 'Max Price',
        value: localFilters.maxPrice,
        displayValue: `${priceRange.currency}${localFilters.maxPrice.toLocaleString()}`,
      });
    }

    if (localFilters.location) {
      active.push({
        key: 'location',
        label: 'Location',
        value: localFilters.location,
        displayValue: localFilters.location,
      });
    }

    if (localFilters.dateFrom) {
      active.push({
        key: 'dateFrom',
        label: 'Date From',
        value: localFilters.dateFrom,
        displayValue: new Date(localFilters.dateFrom).toLocaleDateString(),
      });
    }

    if (localFilters.dateTo) {
      active.push({
        key: 'dateTo',
        label: 'Date To',
        value: localFilters.dateTo,
        displayValue: new Date(localFilters.dateTo).toLocaleDateString(),
      });
    }

    return active;
  };

  const activeFilters = generateActiveFilters();

  // Handle individual filter changes
  const handleFilterChange = (key: keyof ListingsFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  // Handle price range changes
  const handlePriceRangeChange = (min: number | null, max: number | null) => {
    setLocalPriceRange(prev => ({ ...prev, min, max }));
    setLocalFilters(prev => ({
      ...prev,
      minPrice: min || undefined,
      maxPrice: max || undefined,
    }));
  };

  // Handle date range changes
  const handleDateRangeChange = (from: Date | null, to: Date | null) => {
    setLocalDateRange(prev => ({ ...prev, from, to }));
    setLocalFilters(prev => ({
      ...prev,
      dateFrom: from ? from.toISOString().split('T')[0] : undefined,
      dateTo: to ? to.toISOString().split('T')[0] : undefined,
    }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    onChange(localFilters);
  };

  // Clear all filters
  const handleClearAll = () => {
    const clearedFilters: ListingsFilters = {};
    setLocalFilters(clearedFilters);
    setLocalPriceRange({ min: null, max: null, currency: priceRange.currency });
    setLocalDateRange({ from: null, to: null });
    onClear();
  };

  // Remove specific active filter
  const removeActiveFilter = (filterKey: keyof ListingsFilters) => {
    const newFilters = { ...localFilters };
    delete newFilters[filterKey];
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon color="primary" />
            Filters
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearAll}
              disabled={loading || activeFilters.length === 0}
            >
              Clear All
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<ApplyIcon />}
              onClick={handleApplyFilters}
              disabled={loading}
            >
              Apply
            </Button>
          </Box>
        </Box>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Active Filters ({activeFilters.length})
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {activeFilters.map((filter) => (
                <Chip
                  key={`${filter.key}-${filter.value}`}
                  label={`${filter.label}: ${filter.displayValue}`}
                  onDelete={() => removeActiveFilter(filter.key)}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Filter Controls */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Filter Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              {/* Status Filter */}
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={localFilters.status || 'all'}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Category Filter */}
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={localFilters.category || 'all'}
                  label="Category"
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  {categoryOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Condition Filter */}
              <FormControl fullWidth size="small">
                <InputLabel>Condition</InputLabel>
                <Select
                  value={localFilters.condition || 'all'}
                  label="Condition"
                  onChange={(e) => handleFilterChange('condition', e.target.value)}
                >
                  {conditionOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider />

              {/* Price Range Filter */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Price Range
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      size="small"
                      label="Min Price"
                      type="number"
                      value={localPriceRange.min || ''}
                      onChange={(e) => {
                        const min = e.target.value ? parseFloat(e.target.value) : null;
                        handlePriceRangeChange(min, localPriceRange.max);
                      }}
                      InputProps={{
                        startAdornment: <span>{priceRange.currency}</span>,
                      }}
                    />
                    <TextField
                      size="small"
                      label="Max Price"
                      type="number"
                      value={localPriceRange.max || ''}
                      onChange={(e) => {
                        const max = e.target.value ? parseFloat(e.target.value) : null;
                        handlePriceRangeChange(localPriceRange.min, max);
                      }}
                      InputProps={{
                        startAdornment: <span>{priceRange.currency}</span>,
                      }}
                    />
                  </Box>
                  
                  {/* Price Range Slider */}
                  <Slider
                    value={[
                      localPriceRange.min || 0,
                      localPriceRange.max || 1000,
                    ]}
                    onChange={(_, value) => {
                      const [min, max] = value as number[];
                      handlePriceRangeChange(
                        min === 0 ? null : min,
                        max === 1000 ? null : max
                      );
                    }}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${priceRange.currency}${value}`}
                    min={0}
                    max={10000}
                    step={50}
                    marks={[
                      { value: 0, label: '$0' },
                      { value: 1000, label: '$1K' },
                      { value: 2500, label: '$2.5K' },
                      { value: 5000, label: '$5K' },
                      { value: 10000, label: '$10K' },
                    ]}
                    disabled={loading}
                  />
                </Stack>
              </Box>

              <Divider />

              {/* Date Range Filter */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Date Range
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      size="small"
                      label="From Date"
                      type="date"
                      value={localDateRange.from ? localDateRange.from.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const from = e.target.value ? new Date(e.target.value) : null;
                        handleDateRangeChange(from, localDateRange.to);
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      size="small"
                      label="To Date"
                      type="date"
                      value={localDateRange.to ? localDateRange.to.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const to = e.target.value ? new Date(e.target.value) : null;
                        handleDateRangeChange(localDateRange.from, to);
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                </Stack>
              </Box>

              {/* Location Filter */}
              <TextField
                size="small"
                label="Location"
                placeholder="City, State, or ZIP code"
                value={localFilters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                fullWidth
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Paper>
  );
};

export default Filters;