import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';
import type { TextFieldProps } from '../../../types/forms';

/**
 * TitleField component for listing titles with character counter
 * Uses shadcn/ui components and Tailwind CSS
 */
const TitleField: React.FC<TextFieldProps> = ({
  name = 'title',
  label = 'Title',
  required = true,
  maxLength = 100,
  showCharacterCount = true,
  helperText,
  className,
  ...props
}) => {
  const {
    control,
    formState: { errors, touchedFields },
    watch,
  } = useFormContext();

  const watchedTitle = watch(name);
  const error = errors[name]?.message as string;
  const isTouched = touchedFields[name];
  const characterCount = watchedTitle?.length || 0;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  const displayHelperText = () => {
    if (error && isTouched) {
      return error;
    }
    return helperText || 'Enter a descriptive title for your listing';
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? 'Title is required' : false,
          minLength: {
            value: 3,
            message: 'Title must be at least 3 characters',
          },
          maxLength: {
            value: maxLength,
            message: `Title must be no more than ${maxLength} characters`,
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
            <Input
              id={name}
              {...field}
              {...props}
              maxLength={maxLength}
              className={cn(
                "rounded-none border-input focus:ring-2",
                fieldState.error && "border-destructive focus-visible:ring-destructive",
                isOverLimit && "border-destructive",
                isNearLimit && !isOverLimit && "border-warning"
              )}
            />
            
            <div className="flex justify-between items-start text-xs mt-1">
              <span className={cn(
                "text-muted-foreground",
                fieldState.error && "text-destructive"
              )}>
                {displayHelperText()}
              </span>
              
              {showCharacterCount && (
                <span className={cn(
                  "font-mono ml-2",
                  isOverLimit ? "text-destructive font-bold" :
                  isNearLimit ? "text-warning font-bold" : "text-muted-foreground"
                )}>
                  {characterCount}/{maxLength}
                </span>
              )}
            </div>
          </div>
        )}
      />

      {/* Warning/Tip Box */}
      {showCharacterCount && (isNearLimit || isOverLimit) && (
        <div className={cn(
          "p-2 rounded-sm text-xs border",
          isOverLimit ? "bg-destructive/10 border-destructive/20 text-destructive" :
          "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
        )}>
          <strong>Tip:</strong> A good title should be clear and descriptive.
          {isNearLimit && !isOverLimit && " You're getting close to the character limit."}
          {isOverLimit && " Please reduce the title length."}
        </div>
      )}
    </div>
  );
};

export default TitleField;