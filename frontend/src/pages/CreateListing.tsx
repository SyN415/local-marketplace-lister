import { Box, Typography, TextField, Button, Paper, Container, MenuItem } from '@mui/material';
import { useForm } from 'react-hook-form';
import type { ListingFormData } from '../types';

const CreateListing = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ListingFormData>();

  const onSubmit = (data: ListingFormData) => {
    // TODO: Implement listing creation logic
    console.log('Create listing form submitted:', data);
  };

  const categories = [
    'Electronics',
    'Clothing',
    'Home & Garden',
    'Sports',
    'Books',
    'Toys',
    'Automotive',
    'Other'
  ];

  const conditions = [
    'New',
    'Like New',
    'Good',
    'Fair',
    'Poor'
  ];

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Listing
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Title"
            required
            margin="normal"
            {...register('title', { required: 'Title is required' })}
            error={!!errors.title}
            helperText={errors.title?.message}
          />
          
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            margin="normal"
            {...register('description')}
          />
          
          <TextField
            fullWidth
            label="Price"
            type="number"
            required
            margin="normal"
            {...register('price', { 
              required: 'Price is required',
              min: { value: 0.01, message: 'Price must be greater than 0' }
            })}
            error={!!errors.price}
            helperText={errors.price?.message}
          />
          
          <TextField
            fullWidth
            select
            label="Category"
            required
            margin="normal"
            {...register('category', { required: 'Category is required' })}
            error={!!errors.category}
            helperText={errors.category?.message}
          >
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            fullWidth
            select
            label="Condition"
            required
            margin="normal"
            {...register('condition', { required: 'Condition is required' })}
            error={!!errors.condition}
            helperText={errors.condition?.message}
          >
            {conditions.map((condition) => (
              <MenuItem key={condition} value={condition}>
                {condition}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            fullWidth
            label="Location"
            margin="normal"
            {...register('location')}
          />
          
          <Box sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
            >
              Create Listing
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateListing;