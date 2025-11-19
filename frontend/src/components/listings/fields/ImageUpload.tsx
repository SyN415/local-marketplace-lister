import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Alert,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  AutoAwesome,
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import type { ImageUploadFieldProps } from '../../../types/forms';
import { listingsAPI } from '../../../services/api';
import { CircularProgress, Button } from '@mui/material';

interface PreviewFile extends File {
  preview: string;
}

interface ExtendedImageUploadProps extends ImageUploadFieldProps {
  onAnalysisComplete?: (data: any) => void;
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
    <Box>
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
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {label} {required && '*'}
            </Typography>
            
            <Paper
              {...getRootProps()}
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: currentFiles.length >= maxFiles ? 'not-allowed' : 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                borderColor: isDragActive ? 'primary.main' : 
                             isDragReject || !!fieldState.error ? 'error.main' : 'divider',
                borderStyle: 'dashed',
                borderWidth: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: currentFiles.length >= maxFiles ? 'divider' : 'primary.main',
                  bgcolor: currentFiles.length >= maxFiles ? 'background.paper' : 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <CloudUpload 
                  sx={{ 
                    fontSize: 48, 
                    color: isDragActive ? 'primary.main' : 'text.secondary' 
                  }} 
                />
                <Typography variant="h6" color="text.primary">
                  {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to select files
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Supported formats: JPEG, PNG, WebP, GIF
                  <br />
                  Max size: {maxFileSize / 1024 / 1024}MB per file
                  <br />
                  Max files: {maxFiles} ({currentFiles.length}/{maxFiles} used)
                </Typography>
              </Box>
            </Paper>

            {/* Error Message */}
            {(fieldState.error || customError) && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {fieldState.error?.message || customError}
              </Alert>
            )}

            {/* Helper Text */}
            {helperText && !fieldState.error && !customError && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {helperText}
              </Typography>
            )}

            {/* Image Previews */}
            {previews.length > 0 && (
              <ImageList 
                sx={{ mt: 2, mb: 0 }} 
                cols={3} 
                rowHeight={160}
                gap={8}
              >
                {previews.map((file, index) => (
                  <ImageListItem key={file.preview + index}>
                    <img
                      src={file.preview}
                      alt={`Preview ${index + 1}`}
                      loading="lazy"
                      style={{ 
                        height: '100%', 
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                    />
                    <ImageListItemBar
                      sx={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                      }}
                      position="top"
                      actionIcon={
                        <IconButton
                          sx={{ color: 'white' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          aria-label={`remove image ${index + 1}`}
                          size="small"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      }
                      actionPosition="right"
                    />
                    {index === 0 && (
                      <>
                        <ImageListItemBar
                          title="Cover Image"
                          position="bottom"
                          sx={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            borderBottomLeftRadius: 4,
                            borderBottomRightRadius: 4,
                            '& .MuiImageListItemBar-title': {
                              fontSize: '0.75rem',
                              textAlign: 'center',
                            }
                          }}
                        />
                        {onAnalysisComplete && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              zIndex: 2,
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              '.MuiImageListItem-root:hover &': {
                                opacity: 1,
                              },
                            }}
                          >
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={isAnalyzing ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyze(file);
                              }}
                              disabled={isAnalyzing}
                              sx={{
                                background: 'rgba(255, 255, 255, 0.9)',
                                color: 'primary.main',
                                '&:hover': {
                                  background: '#fff',
                                },
                                whiteSpace: 'nowrap',
                                boxShadow: 3,
                              }}
                            >
                              {isAnalyzing ? 'Analyzing...' : 'Auto-fill Details'}
                            </Button>
                          </Box>
                        )}
                      </>
                    )}
                  </ImageListItem>
                ))}
              </ImageList>
            )}
          </Box>
        )}
      />
    </Box>
  );
};

export default ImageUpload;