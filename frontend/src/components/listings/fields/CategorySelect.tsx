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
import type { SelectFieldProps } from '../../../types/forms';
import { LISTING_CATEGORIES } from '../../../schemas/listing.schema';

/**
 * CategorySelect component for selecting listing categories
 * Provides pre-defined categories with validation using shadcn/ui
 */
const CategorySelect: React.FC<SelectFieldProps> = ({
  name = 'category',
  label = 'Category',
  required = true,
  helperText,
  options = LISTING_CATEGORIES.map(cat => ({ value: cat, label: cat })),
  className,
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
          required: required ? 'Category is required' : false,
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
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={(option as any).disabled}
                  >
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
                : helperText || 'Select the most appropriate category for your item'}
            </span>
          </div>
        )}
      />
      
      {/* Category guidance */}
      <div className="mt-2 p-2 rounded-sm bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400">
        <strong>Tip:</strong> Choose the category that best describes your item. 
        This helps buyers find your listing more easily.
      </div>
    </div>
  );
};

export default CategorySelect;