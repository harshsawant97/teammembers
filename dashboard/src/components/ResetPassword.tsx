import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, Alert, CircularProgress } from '@mui/material';
import { Lock, ArrowForward, CheckCircle } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import { PageWrapper } from './PageWrapper';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export const ResetPassword: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  
  const oobCode = query.get('oobCode');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then((userEmail) => {
          setEmail(userEmail);
        })
        .catch((err) => {
          setError('Invalid or expired password reset link. Please request a new one.');
        });
    } else {
      setError('No reset code found in URL.');
    }
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!oobCode) {
      setError('No reset code found.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper className="min-h-screen bg-slate-900 relative overflow-hidden w-full flex items-center justify-center p-4">
      <Box className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
      <Box className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-teal-500/20 rounded-full blur-[100px] mix-blend-screen" />
      
      <Box className="w-full max-w-md mx-auto z-10">
        <Box className="glass-panel rounded-3xl p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20 backdrop-blur-2xl relative bg-white/10">
          <Box className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50 rounded-t-3xl" />
          
          <Typography variant="h4" className="font-bold text-white mb-2 text-center tracking-wide">
            Secure Password Reset
          </Typography>
          
          {email ? (
            <Typography variant="body2" className="text-indigo-200 text-center mb-8 font-medium">
              Updating password for {email}
            </Typography>
          ) : (
            <Box className="mb-8" />
          )}

          {error && (
            <Alert severity="error" className="mb-6 bg-red-500/20 text-red-200 border border-red-500/50">
              {error}
            </Alert>
          )}

          {success ? (
            <Box className="text-center flex flex-col items-center">
              <CheckCircle className="text-teal-400 w-20 h-20 mb-4" />
              <Typography className="text-white font-bold text-xl mb-6">Password Reset Successfully!</Typography>
              <Button 
                variant="contained"
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-indigo-500 to-teal-400 text-white font-bold py-3 px-8 rounded-xl"
              >
                Return to Login
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} className="flex flex-col gap-6">
              <TextField 
                variant="outlined"
                placeholder="New Password"
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
                  sx: { '& fieldset': { border: 'none' } }
                }}
              />
              
              <TextField 
                variant="outlined"
                placeholder="Confirm New Password"
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock className="text-indigo-300" />
                    </InputAdornment>
                  ),
                  className: "text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl font-medium",
                  sx: { '& fieldset': { border: 'none' } }
                }}
              />

              <Button 
                type="submit"
                variant="contained"
                disabled={loading || !!error}
                endIcon={!loading && <ArrowForward />}
                className="mt-4 bg-gradient-to-r from-indigo-500 to-teal-400 hover:from-indigo-600 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1"
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirm New Password'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </PageWrapper>
  );
};