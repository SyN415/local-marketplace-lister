import React, { useState, useEffect } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { AttachMoney } from '@mui/icons-material';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';
import type { TextFieldProps } from '../../../types/forms';

// Internal component to handle decimal input state
interface PriceInputProps extends Omit<TextFieldProps, 'onChange' | 'value' | 'error' | 'helperText'> {
  value: number;
  onChange: (value: number) => void;
  error?: boolean;
  helperText?: React.ReactNode;
  onFocus?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  className,
  ...props
}) => {
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Sync with parent value when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value ? value.toString() : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, digits, one decimal point, max 2 decimal places
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setLocalValue(val);
      const num = parseFloat(val);
      onChange(isNaN(num) ? 0 : num);
    }
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
        <AttachMoney fontSize="small" />
      </div>
      <Input
        {...props}
        value={localValue}
        onChange={handleChange}
        onFocus={(e) => {
          setIsFocused(true);
          if (onFocus) onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          // On blur, ensure valid string format matches the number
          const num = parseFloat(localValue);
          setLocalValue(num ? num.toString() : '');
          if (onBlur) onBlur(e);
        }}
        inputMode="decimal"
        className={cn(
          "pl-9",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
      />
    </div>
  );
};

/**
 * PriceField component for listing prices with currency formatting
 */
const PriceField: React.FC<TextFieldProps> = ({
  name = 'price',
  label = 'Price',
  required = true,
  helperText,
  className,
  ...props
}) => {
  const {
    control,
    formState: { errors, touchedFields },
  } = useFormContext();

  const error = errors[name]?.message as string;
  const isTouched = touchedFields[name];

  return (
    <div className={cn("space-y-2", className)}>
      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? 'Price is required' : false,
          min: {
            value: 0.01,
            message: 'Price must be greater than $0',
          },
          max: {
            value: 999999.99,
            message: 'Price must be less than $999,999.99',
          },
        }}
        render={({ field, fieldState }) => (
          <div className="space-y-1">
            <Label 
              htmlFor={name}
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {label} {required && <span className="text-destructive">*</span>}
            </Label>
            
            <PriceInput
              {...props}
              {...field}
              id={name}
              label={label}
              error={!!fieldState.error}
            />

            <div className="flex justify-between items-start text-xs mt-1">
              <span className={cn(
                "text-muted-foreground",
                error && isTouched && "text-destructive"
              )}>
                {error && isTouched 
                  ? error 
                  : helperText || 'Enter the price for your listing'}
              </span>
              
              {field.value > 0 && !error && (
                <span className="text-green-600 dark:text-green-400 font-medium ml-2">
                  ${field.value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              )}
            </div>
          </div>
        )}
      />
      
      {/* Price ranges info */}
      <div className="mt-2 p-2 rounded-sm bg-muted/50 border border-border text-xs text-muted-foreground">
        <strong>Price Guidelines:</strong>
        <ul className="mt-1 list-disc list-inside space-y-0.5">
          <li>Research similar items to set competitive prices</li>
          <li>Consider item condition and market demand</li>
          <li>Factor in shipping costs if applicable</li>
        </ul>
      </div>
    </div>
  );
};

export default PriceField;