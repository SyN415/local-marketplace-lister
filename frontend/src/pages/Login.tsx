import { Box, Typography, TextField, Button, Paper, Container } from '@mui/material';

const Login = () => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Implement authentication logic
    console.log('Login form submitted');
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Login
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            required
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
          >
            Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;