import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import type { SearchBarProps } from '../../types/listings';

/**
 * SearchBar component with debounced search functionality
 * Provides text search for listings with optional category filter
 * 
 * @param props - Component props including value, onChange, and configuration
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search listings...',
  debounceMs = 300,
  loading = false,
  onClear,
  autoFocus = false,
}) => {
  const [searchValue, setSearchValue] = useState(value);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Categories for search filtering
  const categories = [
    'All Categories',
    'Electronics',
    'Furniture',
    'Clothing',
    'Vehicles',
    'Books',
    'Sports',
    'Home & Garden',
    'Other',
  ];

  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Sync with external value changes
  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  // Debounced search effect
  // Note: onChange is intentionally NOT in dependencies to prevent infinite loops
  // The callback is stable and doesn't need to trigger re-execution
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchValue.trim()) {
      setHasSearched(true);
      debounceTimer.current = setTimeout(() => {
        onChange(searchValue);
      }, debounceMs);
    } else {
      if (hasSearched) {
        onChange('');
      }
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, debounceMs, hasSearched]);

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  };

  // Handle clear search
  const handleClear = () => {
    setSearchValue('');
    setHasSearched(false);
    onClear?.();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle category change
  const handleCategoryChange = (event: any) => {
    setSelectedCategory(event.target.value);
    // Trigger search with category filter
    if (searchValue.trim()) {
      onChange(searchValue);
    }
  };

  // Show loading state
  const isSearching = loading;

  // Get search suggestions or recent searches (placeholder for future implementation)
  const showSuggestions = false; // Will implement suggestions in future

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Stack spacing={2}>
        {/* Main search input */}
        <TextField
          ref={inputRef}
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={searchValue}
          onChange={handleInputChange}
          autoFocus={autoFocus}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {searchValue && (
                  <IconButton
                    aria-label="clear search"
                    onClick={handleClear}
                    edge="end"
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                )}
                {isSearching && (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderTop: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
                )}
              </InputAdornment>
            ),
            sx: {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            },
          }}
        />

        {/* Search controls */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Category filter */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Category"
              onChange={handleCategoryChange}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Active filters/chips */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {/* Search query chip */}
              {searchValue && (
                <Chip
                  label={`Search: "${searchValue}"`}
                  onDelete={handleClear}
                  deleteIcon={<ClearIcon />}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}

              {/* Category chip */}
              {selectedCategory !== 'All Categories' && (
                <Chip
                  label={`Category: ${selectedCategory}`}
                  onDelete={() => setSelectedCategory('All Categories')}
                  deleteIcon={<ClearIcon />}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>

          {/* Search stats */}
          {hasSearched && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
              {isSearching ? 'Searching...' : `Showing results for "${searchValue}"`}
            </Typography>
          )}
        </Box>

        {/* Quick search suggestions */}
        {showSuggestions && searchValue && (
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Suggestions
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {/* Placeholder for search suggestions */}
              <Chip
                label="iPhone 14"
                size="small"
                variant="outlined"
                onClick={() => setSearchValue('iPhone 14')}
              />
              <Chip
                label="MacBook Pro"
                size="small"
                variant="outlined"
                onClick={() => setSearchValue('MacBook Pro')}
              />
              <Chip
                label="Nike Air Max"
                size="small"
                variant="outlined"
                onClick={() => setSearchValue('Nike Air Max')}
              />
            </Stack>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default SearchBar;