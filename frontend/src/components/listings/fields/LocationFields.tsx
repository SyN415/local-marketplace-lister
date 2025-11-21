import React, { useEffect, useState } from 'react';
import { Box, TextField, Typography, Slider, Paper, InputAdornment, Grid } from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import zipcodes from 'zipcodes';
import type { LocationFieldProps } from '../../../types/forms';

const MIN_DISTANCE = 5;
const MAX_DISTANCE = 100;

// Helper component to update map view when center changes
function MapUpdater({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

/**
 * LocationFields component with Interactive Leaflet Map
 * Features a distance slider and visual radius representation on a real map
 */
const LocationFields: React.FC<Omit<LocationFieldProps, 'value' | 'onChange'>> = ({
  errors,
  disabled = false,
}) => {
  const { control, setValue, watch } = useFormContext();
  
  // Watch distance to update map visual
  const distance = watch('location.distance') || 5;
  const zipCode = watch('location.zipCode');

  // Default center (approx center of US)
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([39.8283, -98.5795]);
  const [zoomLevel, setZoomLevel] = useState(4);

  // Geocoding effect when zip code changes
  useEffect(() => {
    const fetchCoordinates = async () => {
      if (zipCode && zipCode.length >= 5) {
        // 1. Auto-fill City/State using local library (instant)
        const locationData = zipcodes.lookup(zipCode);
        if (locationData) {
          setValue('location.city', locationData.city, { shouldValidate: true });
          setValue('location.state', locationData.state, { shouldValidate: true });
        }

        // 2. Fetch coordinates for map (async)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&postalcode=${zipCode}&country=us`
          );
          const data = await response.json();
          if (data && data.length > 0) {
            const { lat, lon } = data[0];
            setMapCenter([parseFloat(lat), parseFloat(lon)]);
            setZoomLevel(10); // Zoom in when location found
          }
        } catch (error) {
          console.error("Error fetching coordinates:", error);
        }
      }
    };

    // Debounce could be added here, but length check is a basic guard
    const timeoutId = setTimeout(fetchCoordinates, 500);
    return () => clearTimeout(timeoutId);
  }, [zipCode, setValue]);

  const handleDistanceChange = (_event: Event, newValue: number | number[]) => {
    const val = newValue as number;
    setValue('location.distance', val, { shouldDirty: true, shouldValidate: true });
  };

  // Prevent Enter key from submitting the form
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 0,
      '& fieldset': { borderColor: 'divider' },
      '&:hover fieldset': { borderColor: 'text.primary' },
      '&.Mui-focused fieldset': { borderWidth: 2 },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontSize: '0.75rem',
    },
  };

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
                    onKeyDown={handleKeyDown}
                    error={!!fieldState.error || !!errors?.zipCode}
                    helperText={fieldState.error?.message || errors?.zipCode}
                    sx={inputStyles}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MapPin size={20} />
                        </InputAdornment>
                      ),
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
                      onKeyDown={handleKeyDown}
                      error={!!fieldState.error || !!errors?.city}
                      helperText={fieldState.error?.message || errors?.city}
                      sx={inputStyles}
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
                      onKeyDown={handleKeyDown}
                      error={!!fieldState.error || !!errors?.state}
                      helperText={fieldState.error?.message || errors?.state}
                      sx={inputStyles}
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
                    onKeyDown={handleKeyDown}
                    placeholder="Specific address is hidden on public listing"
                    error={!!fieldState.error || !!errors?.address}
                    helperText={fieldState.error?.message || errors?.address}
                    sx={inputStyles}
                  />
                )}
             />
           </Box>
        </Grid>

        {/* Right Column: Interactive Map */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              height: 300,
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid #d1d5db',
              position: 'relative',
              zIndex: 0 // Ensure map stays below other overlays if any
            }}
          >
             <MapContainer 
                center={mapCenter} 
                zoom={zoomLevel} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
             >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Circle 
                    center={mapCenter}
                    radius={distance * 1609.34} // Convert miles to meters
                    pathOptions={{ 
                        color: '#4f46e5', 
                        fillColor: '#6366f1', 
                        fillOpacity: 0.2 
                    }} 
                />
                <MapUpdater center={mapCenter} />
             </MapContainer>

             <Box sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'rgba(255,255,255,0.9)', px: 1, py: 0.5, borderRadius: 1, zIndex: 400, pointerEvents: 'none' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {zipCode ? `Centered on ${zipCode}` : 'Enter Zip Code to focus'}
                </Typography>
             </Box>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
            The circle shows your approximate delivery/service range
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LocationFields;