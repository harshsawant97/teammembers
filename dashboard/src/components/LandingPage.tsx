import React, { useState } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, Alert, CircularProgress } from '@mui/material';
import { Email, Lock, ArrowForward, Face } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendEmailVerification } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'FACULTY' | 'STUDENT'>('FACULTY');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFirebaseToken = async (idToken: string) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/auth/firebase`, { token: idToken, role });
      const { accessToken, user } = response.data;
      if (accessToken && user) {
        login(accessToken, user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Backend auth error:', err);
      setError(err.response?.data?.message || 'Server authentication failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          setError('Please verify your email before logging in. Check your inbox.');
          auth.signOut();
          setLoading(false);
          return;
        }
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Send email verification
        await sendEmailVerification(userCredential.user);
        
        setSuccessMsg('A verification email has been sent to your address. Please check your inbox and verify before logging in.');
        auth.signOut(); // Log them out immediately so they have to verify
        setIsLogin(true); // Switch back to login view
        setLoading(false);
        return;
      }
      
      const idToken = await userCredential.user.getIdToken();
      await handleFirebaseToken(idToken);
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();
      await handleFirebaseToken(idToken);
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError(err.message || 'Google Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden w-full bg-slate-900">
      
      {/* Decorative Orbs for Glassmorphism background effect */}
      <Box className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
      <Box className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-teal-500/20 rounded-full blur-[100px] mix-blend-screen" />
      
      <Box className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        
        {/* Left Side: Hero Text */}
        <Box className="text-left px-4 lg:px-12">
          <Box className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8 border-indigo-400/30 bg-white/5 backdrop-blur-md border">
            <Face className="text-teal-400" />
            <Typography className="text-indigo-200 font-semibold tracking-wide text-sm uppercase">
              Next-Gen Vision AI
            </Typography>
          </Box>
          <Typography variant="h2" className="font-extrabold text-white mb-6 tracking-tight leading-tight drop-shadow-lg">
            Attendance, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">
              Automated.
            </span>
          </Typography>
          <Typography variant="h6" className="text-indigo-100/80 mb-10 font-light leading-relaxed max-w-xl">
            Empower your institution with state-of-the-art facial recognition. 
            Frictionless check-ins, real-time analytics, and absolute precision.
          </Typography>
        </Box>

        {/* Right Side: Glassmorphism Login Form */}
        <Box className="w-full max-w-md mx-auto">
          <Box className="glass-panel rounded-3xl p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20 backdrop-blur-2xl relative bg-white/10">
            
            {/* Glossy highlight effect on top edge */}
            <Box className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50 rounded-t-3xl" />

            <Typography variant="h4" className="font-bold text-white mb-2 text-center tracking-wide">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Typography>
            <Typography variant="body2" className="text-indigo-200 text-center mb-6 font-medium">
              Select your role to continue
            </Typography>

            {/* Role Toggle Switch */}
            <Box className="flex bg-black/20 p-1 rounded-xl mb-8 border border-white/10">
              <Box 
                onClick={() => setRole('FACULTY')}
                className={`flex-1 text-center py-2 rounded-lg cursor-pointer transition-all font-bold text-sm ${role === 'FACULTY' ? 'bg-indigo-500 text-white shadow-md' : 'text-indigo-300 hover:text-white'}`}
              >
                Admin / Faculty
              </Box>
              <Box 
                onClick={() => setRole('STUDENT')}
                className={`flex-1 text-center py-2 rounded-lg cursor-pointer transition-all font-bold text-sm ${role === 'STUDENT' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-300 hover:text-white'}`}
              >
                Student
              </Box>
            </Box>

            {error && (
              <Alert severity="error" className="mb-6 bg-red-500/20 text-red-200 border border-red-500/50">
                {error}
              </Alert>
            )}

            {successMsg && (
              <Alert severity="success" className="mb-6 bg-teal-500/20 text-teal-200 border border-teal-500/50">
                {successMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} className="flex flex-col gap-6">
              <TextField 
                variant="outlined"
                placeholder="Email Address"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email className="text-indigo-300" />
                    </InputAdornment>
                  ),
                  className: "text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl font-medium",
                  sx: {
                    '& fieldset': { border: 'none' },
                  }
                }}
              />
              
              <TextField 
                variant="outlined"
                placeholder="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock className="text-indigo-300" />
                    </InputAdornment>
                  ),
                  className: "text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl font-medium",
                  sx: {
                    '& fieldset': { border: 'none' },
                  }
                }}
              />

              <Button 
                type="submit"
                variant="contained"
                disabled={loading}
                endIcon={!loading && <ArrowForward />}
                className="mt-4 bg-gradient-to-r from-indigo-500 to-teal-400 hover:from-indigo-600 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1"
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : (isLogin ? 'Sign In to Dashboard' : 'Sign Up')}
              </Button>

              <Box className="relative flex py-2 items-center">
                <Box className="flex-grow border-t border-white/10"></Box>
                <span className="flex-shrink-0 mx-4 text-indigo-200/50 text-sm">OR</span>
                <Box className="flex-grow border-t border-white/10"></Box>
              </Box>

              <Button
                variant="outlined"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="bg-white/5 border border-white/20 text-white hover:bg-white/10 font-bold py-3 rounded-xl transition-all duration-300"
                startIcon={<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />}
              >
                Continue with Google
              </Button>

              <Box className="mt-4 text-center">
                <Typography 
                  variant="caption" 
                  onClick={() => { setIsLogin(!isLogin); setError(null); }}
                  className="text-indigo-200/80 cursor-pointer hover:text-white transition-colors text-sm font-medium"
                >
                  {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
        
      </Box>
    </Box>
  );
};
