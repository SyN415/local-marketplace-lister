import React, { useEffect, useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import zipcodes from 'zipcodes';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card } from '../../ui/card';
import { cn } from '../../../lib/utils';
import type { LocationFieldProps } from '../../../types/forms';

// Simple Shadcn Slider Wrapper if not available, otherwise standard range input
// Assuming shadcn slider is available via @radix-ui/react-slider, but standard input range is fine for MVP refactor
const DistanceSlider = ({ value, onChange, min, max, step, disabled }: any) => (
  <input
    type="range"
    min={min}
    max={max}
    step={step}
    value={value}
    onChange={(e) => onChange(parseFloat(e.target.value))}
    disabled={disabled}
    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
  />
);

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

  const handleDistanceChange = (val: number) => {
    setValue('location.distance', val, { shouldDirty: true, shouldValidate: true });
  };

  // Prevent Enter key from submitting the form
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-foreground">Location & Range</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your location and how far you're willing to travel or deliver.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Controls */}
        <div className="space-y-6">
           <div className="space-y-4">
             {/* Zip Code - Primary */}
             <Controller
                name="location.zipCode"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      ZIP Code <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <MapPin size={16} />
                      </div>
                      <Input
                        id="zipCode"
                        {...field}
                        disabled={disabled}
                        onKeyDown={handleKeyDown}
                        className={cn(
                          "pl-9",
                          (fieldState.error || errors?.zipCode) && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                    </div>
                    {(fieldState.error || errors?.zipCode) && (
                      <span className="text-xs text-destructive">
                        {fieldState.error?.message || errors?.zipCode}
                      </span>
                    )}
                  </div>
                )}
             />

             {/* Distance Slider */}
             <div className="space-y-3">
               <div className="flex justify-between items-center">
                 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Distance</Label>
                 <span className="text-sm font-medium text-foreground">{distance} miles</span>
               </div>
               <DistanceSlider
                 value={distance}
                 onChange={handleDistanceChange}
                 min={MIN_DISTANCE}
                 max={MAX_DISTANCE}
                 step={5}
                 disabled={disabled}
               />
               <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{MIN_DISTANCE}m</span>
                  <span>{MAX_DISTANCE}m</span>
               </div>
             </div>

             {/* Detailed Fields (Collapsible/Secondary) */}
             <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="location.city"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        City <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="city"
                        {...field}
                        disabled={disabled}
                        onKeyDown={handleKeyDown}
                        className={cn(
                          (fieldState.error || errors?.city) && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {(fieldState.error || errors?.city) && (
                        <span className="text-xs text-destructive">
                          {fieldState.error?.message || errors?.city}
                        </span>
                      )}
                    </div>
                  )}
                />
                <Controller
                  name="location.state"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        State <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="state"
                        {...field}
                        disabled={disabled}
                        onKeyDown={handleKeyDown}
                        className={cn(
                          (fieldState.error || errors?.state) && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {(fieldState.error || errors?.state) && (
                        <span className="text-xs text-destructive">
                          {fieldState.error?.message || errors?.state}
                        </span>
                      )}
                    </div>
                  )}
                />
             </div>
             
             <Controller
                name="location.address"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Street Address (Optional)
                    </Label>
                    <Input
                      id="address"
                      {...field}
                      disabled={disabled}
                      onKeyDown={handleKeyDown}
                      placeholder="Specific address is hidden on public listing"
                      className={cn(
                        (fieldState.error || errors?.address) && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {(fieldState.error || errors?.address) && (
                      <span className="text-xs text-destructive">
                        {fieldState.error?.message || errors?.address}
                      </span>
                    )}
                  </div>
                )}
             />
           </div>
        </div>

        {/* Right Column: Interactive Map */}
        <div>
          <Card className="overflow-hidden h-[300px] border border-border relative z-0">
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

             <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-medium text-muted-foreground z-[400] pointer-events-none shadow-sm">
                {zipCode ? `Centered on ${zipCode}` : 'Enter Zip Code to focus'}
             </div>
          </Card>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            The circle shows your approximate delivery/service range
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationFields;