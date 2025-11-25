import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';
import { LISTING_CONDITIONS } from '../../../schemas/listing.schema';
import type { SelectFieldProps } from '../../../types/forms';

/**
 * ConditionSelect component for selecting item condition
 * Uses shadcn/ui components
 */
const ConditionSelect: React.FC<SelectFieldProps> = ({
  name = 'condition',
  label = 'Condition',
  required = true,
  helperText,
  className,
}) => {
  const {
    control,
    formState: { errors, touchedFields },
  } = useFormContext();

  const error = errors[name]?.message as string;
  const isTouched = touchedFields[name];

  const options = LISTING_CONDITIONS.map(condition => {
    let label = condition.replace('_', ' ');
    label = label.charAt(0).toUpperCase() + label.slice(1);
    return {
      value: condition,
      label: label
    };
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? 'Condition is required' : false,
        }}
        render={({ field, fieldState }) => (
          <div className="space-y-1">
            <Label 
              htmlFor={name}
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {label} {required && <span className="text-destructive">*</span>}
            </Label>
            
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <SelectTrigger
                id={name}
                className={cn(
                  "w-full",
                  fieldState.error && "border-destructive focus:ring-destructive"
                )}
              >
                <SelectValue placeholder="Select item condition" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className={cn(
              "text-xs text-muted-foreground block",
              error && isTouched && "text-destructive"
            )}>
              {error && isTouched
                ? error
                : helperText || 'Select the condition of your item'}
            </span>
          </div>
        )}
      />
    </div>
  );
};

export default ConditionSelect;