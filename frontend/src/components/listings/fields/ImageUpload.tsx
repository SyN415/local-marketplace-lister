import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFormContext, Controller } from 'react-hook-form';
import { CloudUpload, Trash2, Wand2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { cn } from '../../../lib/utils';
import type { ImageUploadFieldProps } from '../../../types/forms';
import { listingsAPI } from '../../../services/api';

interface PreviewFile extends File {
  preview: string;
}

interface ExtendedImageUploadProps extends ImageUploadFieldProps {
  onAnalysisComplete?: (data: any) => void;
  className?: string;
}

/**
 * ImageUpload component with drag and drop functionality
 * Supports multiple file uploads, previews, and removal
 */
const ImageUpload: React.FC<ExtendedImageUploadProps> = ({
  name = 'images',
  label = 'Images',
  required = false,
  maxFiles = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  helperText,
  error: customError,
  onAnalysisComplete,
  className,
}) => {
  const {
    control,
    setValue,
    watch,
  } = useFormContext();

  const currentFiles = watch(name) as File[] || [];
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generate previews for new files
  useEffect(() => {
    const newPreviews = currentFiles.map((file) => {
      const existingPreview = previews.find((p) => p.name === file.name && p.size === file.size);
      if (existingPreview) return existingPreview;
      
      return Object.assign(file, {
        preview: URL.createObjectURL(file),
      }) as PreviewFile;
    });

    setPreviews(newPreviews);

    // Cleanup function
    return () => {
      newPreviews.forEach((file) => {
        if (!previews.find(p => p.preview === file.preview)) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [currentFiles]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...currentFiles, ...acceptedFiles].slice(0, maxFiles);
    setValue(name, newFiles, { shouldValidate: true, shouldDirty: true });
  }, [currentFiles, maxFiles, name, setValue]);

  const removeFile = useCallback((indexToRemove: number) => {
    const newFiles = currentFiles.filter((_, index) => index !== indexToRemove);
    setValue(name, newFiles, { shouldValidate: true, shouldDirty: true });
  }, [currentFiles, name, setValue]);

  const handleAnalyze = async (file: File) => {
    if (!onAnalysisComplete) return;
    
    setIsAnalyzing(true);
    try {
      const result = await listingsAPI.analyzeImage(file);
      onAnalysisComplete(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      // Could add a toast notification here
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    maxFiles: maxFiles - currentFiles.length,
    disabled: currentFiles.length >= maxFiles,
  });

  return (
    <div className={cn("space-y-4", className)}>
      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? 'At least one image is required' : false,
          validate: (files: File[]) => {
            if (files.length > maxFiles) return `Maximum ${maxFiles} images allowed`;
            return true;
          }
        }}
        render={({ fieldState }) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {label} {required && <span className="text-destructive">*</span>}
              </label>
              <span className="text-xs text-muted-foreground">
                {currentFiles.length}/{maxFiles}
              </span>
            </div>
            
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:bg-muted/50",
                isDragActive ? "border-primary bg-muted" : "border-muted-foreground/25",
                (isDragReject || fieldState.error || customError) && "border-destructive/50 bg-destructive/5",
                currentFiles.length >= maxFiles && "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "p-3 rounded-full bg-muted",
                  isDragActive && "bg-primary/10 text-primary"
                )}>
                  <CloudUpload className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to select files
                  </p>
                </div>
                <div className="text-[10px] text-muted-foreground mt-2">
                  Supported formats: JPEG, PNG, WebP, GIF
                  <br />
                  Max size: {maxFileSize / 1024 / 1024}MB per file
                </div>
              </div>
            </div>

            {/* Error Message */}
            {(fieldState.error || customError) && (
              <Alert variant="destructive">
                <AlertDescription>
                  {fieldState.error?.message || customError}
                </AlertDescription>
              </Alert>
            )}

            {/* Helper Text */}
            {helperText && !fieldState.error && !customError && (
              <p className="text-[0.8rem] text-muted-foreground">
                {helperText}
              </p>
            )}

            {/* Image Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {previews.map((file, index) => (
                  <Card key={file.preview + index} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                    <img
                      src={file.preview}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                       <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                       </div>
                       
                       {index === 0 && (
                         <div className="bg-black/60 text-white text-[10px] text-center py-1 rounded">
                           Cover Image
                         </div>
                       )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Auto-fill Button */}
            {previews.length > 0 && onAnalysisComplete && (
              <div className="pt-2">
                <Button
                  type="button"
                  className="w-full font-bold uppercase tracking-wider"
                  size="lg"
                  onClick={() => handleAnalyze(previews[0])}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>Analyzing...</>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Analyze Images & Auto-Fill Details
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Use AI to scan your cover image and automatically generate listing details
                </p>
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
};

export default ImageUpload;