import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import VoyageDetailPage from './pages/VoyageDetailPage';
import ReservationPage from './pages/ReservationPage';
import AuthCallback from './components/AuthCallback';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import MyReservationsPage from './pages/MyReservationsPage';
import ReservationDetailsPage from './pages/ReservationDetailsPage';
import ProgrammePage from './pages/ProgrammePage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import './App.css';

// Load Google Client ID from environment variable
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.error('REACT_APP_GOOGLE_CLIENT_ID is not defined in environment variables');
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/complete-profile" element={<CompleteProfilePage />} />
                <Route path="/compagnies" element={<ProgrammePage />} />
                <Route path="/voyage/:id" element={<VoyageDetailPage />} />
                <Route path="/reservation/:voyageId" element={<ReservationPage />} />
                <Route path="/my-reservations" element={<MyReservationsPage />} />
                <Route path="/reservation-details/:id" element={<ReservationDetailsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
