import React from 'react';
import { Box, TextField, Typography, Slider, Paper, InputAdornment, Grid } from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import type { LocationFieldProps } from '../../../types/forms';

const MIN_DISTANCE = 5;
const MAX_DISTANCE = 100;

/**
 * LocationFields component with Circular Map UI
 * Features a distance slider and visual radius representation
 */
const LocationFields: React.FC<LocationFieldProps> = ({
  value,
  onChange,
  errors,
  disabled = false,
}) => {
  const { control, setValue, watch } = useFormContext();
  
  // Watch distance to update map visual
  const distance = watch('location.distance') || 5;

  const handleDistanceChange = (_event: Event, newValue: number | number[]) => {
    const val = newValue as number;
    setValue('location.distance', val, { shouldDirty: true });
    onChange({ ...value, distance: val });
  };

  // Calculate circle size for visual representation
  // Base size 50px + (percentage of max * available space)
  // Max map area 300x300
  const mapSize = 300;
  const maxRadiusPixels = mapSize / 2 - 20; // padding
  const pixelRadius = 20 + ((distance - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE)) * (maxRadiusPixels - 20);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Location & Range
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Set your location and how far you're willing to travel or deliver.
      </Typography>

      <Grid container spacing={4}>
        {/* Left Column: Controls */}
        <Grid size={{ xs: 12, md: 6 }}>
           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
             {/* Zip Code - Primary */}
             <Controller
                name="location.zipCode"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="ZIP Code"
                    required
                    fullWidth
                    disabled={disabled}
                    error={!!fieldState.error || !!errors?.zipCode}
                    helperText={fieldState.error?.message || errors?.zipCode}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MapPin size={20} />
                        </InputAdornment>
                      ),
                    }}
                    onChange={(e) => {
                        field.onChange(e);
                        onChange({ ...value, zipCode: e.target.value });
                    }}
                  />
                )}
             />

             {/* Distance Slider */}
             <Box>
               <Typography id="distance-slider" gutterBottom variant="subtitle2" color="text.secondary">
                 Distance: {distance} miles
               </Typography>
               <Slider
                 value={distance}
                 onChange={handleDistanceChange}
                 min={MIN_DISTANCE}
                 max={MAX_DISTANCE}
                 step={5}
                 marks={[
                   { value: 5, label: '5m' },
                   { value: 25, label: '25m' },
                   { value: 50, label: '50m' },
                   { value: 100, label: '100m' },
                 ]}
                 valueLabelDisplay="auto"
                 aria-labelledby="distance-slider"
                 disabled={disabled}
                 sx={{
                   color: 'primary.main',
                   '& .MuiSlider-thumb': {
                     boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                   }
                 }}
               />
             </Box>

             {/* Detailed Fields (Collapsible/Secondary) */}
             <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Controller
                  name="location.city"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="City"
                      required
                      fullWidth
                      size="small"
                      disabled={disabled}
                      error={!!fieldState.error || !!errors?.city}
                      helperText={fieldState.error?.message || errors?.city}
                      onChange={(e) => {
                          field.onChange(e);
                          onChange({ ...value, city: e.target.value });
                      }}
                    />
                  )}
                />
                <Controller
                  name="location.state"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="State"
                      required
                      fullWidth
                      size="small"
                      disabled={disabled}
                      error={!!fieldState.error || !!errors?.state}
                      helperText={fieldState.error?.message || errors?.state}
                       onChange={(e) => {
                          field.onChange(e);
                          onChange({ ...value, state: e.target.value });
                      }}
                    />
                  )}
                />
             </Box>
             <Controller
                name="location.address"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Street Address (Optional)"
                    fullWidth
                    size="small"
                    disabled={disabled}
                    placeholder="Specific address is hidden on public listing"
                    error={!!fieldState.error || !!errors?.address}
                    helperText={fieldState.error?.message || errors?.address}
                     onChange={(e) => {
                          field.onChange(e);
                          onChange({ ...value, address: e.target.value });
                      }}
                  />
                )}
             />
           </Box>
        </Grid>

        {/* Right Column: Visual Map Simulation */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              height: mapSize,
              bgcolor: '#e5e7eb', // gray-200
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #d1d5db',
              backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
             {/* Scale Legend */}
             <Box sx={{ position: 'absolute', bottom: 8, right: 12, bgcolor: 'rgba(255,255,255,0.8)', px: 1, borderRadius: 1, zIndex: 5 }}>
                <Typography variant="caption" color="text.secondary">
                    Map Simulation
                </Typography>
             </Box>

             {/* The Radius Circle */}
             <Box
               sx={{
                 width: pixelRadius * 2,
                 height: pixelRadius * 2,
                 borderRadius: '50%',
                 bgcolor: 'rgba(99, 102, 241, 0.15)', // Indigo-500 with low opacity
                 border: '2px solid rgba(99, 102, 241, 0.5)',
                 position: 'absolute',
                 transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 pointerEvents: 'none',
               }}
             />

             {/* Center Point */}
             <Box
                sx={{
                    zIndex: 2,
                    color: '#4f46e5', // indigo-600
                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))',
                }}
             >
                <MapPin size={32} fill="currentColor" color="white" />
             </Box>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
            Visual representation of your approximate location and range
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LocationFields;