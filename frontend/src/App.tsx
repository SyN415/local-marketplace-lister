import { Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Listings from './pages/Listings';
import Login from './pages/Login';
import CreateListing from './pages/CreateListing';

function App() {
  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-listing" element={<CreateListing />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
