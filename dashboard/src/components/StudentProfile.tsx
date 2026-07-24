import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Divider, Switch } from '@mui/material';
import { Person, Email, Badge, Business, DarkMode, Edit, Lock, Key, Phone } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { auth } from '../firebase';
import { verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { PageWrapper } from './PageWrapper';
import { LegendaryCard } from './LegendaryCard';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('setting_darkMode') !== 'false');

  // Edit Email State
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setPassError('Please fill in all password fields.');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPassError('New passwords do not match.');
      return;
    }
    if (passwords.new.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (!user?.email || !auth.currentUser) return;

    setPassLoading(true);
    setPassError(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwords.new);
      
      setPassSuccess(true);
      setTimeout(() => {
        setIsChangingPassword(false);
        setPassSuccess(false);
        setPasswords({ current: '', new: '', confirm: '' });
      }, 2000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setPassError('Incorrect current password.');
      } else {
        setPassError(err.message || 'Failed to update password.');
      }
    } finally {
      setPassLoading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/v1/students', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const me = res.data.find((s: any) => s.id === user?.studentId);
        setStudentData(me);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleThemeChange = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem('setting_darkMode', String(checked));
    window.dispatchEvent(new Event('theme-changed'));
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      setEditMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    if (!auth.currentUser) {
      setEditMessage({ type: 'error', text: 'You are not fully authenticated with Firebase.' });
      return;
    }
    
    setEditLoading(true);
    setEditMessage(null);
    try {
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
      
      if (studentData?.id) {
        await axios.put(`/api/v1/students/${studentData.id}`, {
          ...studentData,
          email: newEmail
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      
      setEditMessage({ type: 'success', text: 'Verification link sent! Please check your new email inbox, verify the link, and then log back in.' });
      // Optional: automatically log them out after a few seconds so they log back in with the new email
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setEditMessage({ type: 'error', text: 'This action requires a recent login. Please log out and log back in, then try again.' });
      } else {
        setEditMessage({ type: 'error', text: err.message || 'Failed to update email.' });
      }
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper className="flex h-screen items-center justify-center bg-slate-900 w-full">
        <CircularProgress className="text-teal-400" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="p-4 md:p-8 min-h-screen relative overflow-hidden bg-slate-900 w-full flex flex-col items-center">
      <Box className="absolute top-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      <Box className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-teal-500/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-5xl flex flex-col gap-8"
      >
        {/* Profile Hero Header */}
        <motion.div variants={itemVariants}>
          <Box className="glass-panel rounded-[2.5rem] overflow-hidden relative border border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
            {/* Cover Banner */}
            <Box className="h-48 w-full bg-gradient-to-r from-teal-500/30 via-indigo-500/30 to-purple-500/30 relative">
              <Box className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay" />
            </Box>
            
            <Box className="px-8 pb-10 pt-0 relative flex flex-col items-center sm:items-start sm:flex-row gap-6">
              {/* Floating Avatar */}
              <Box className="w-32 h-32 rounded-full border-4 border-slate-900 bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center text-white text-5xl font-black shadow-2xl mt-[-4rem] z-10 relative overflow-hidden group">
                <Box className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {studentData?.firstName?.[0]}{studentData?.lastName?.[0]}
              </Box>
              
              <Box className="flex-1 text-center sm:text-left mt-4 sm:mt-6">
                <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-100 tracking-tight drop-shadow-md">
                  {studentData?.firstName} {studentData?.lastName}
                </Typography>
                <Typography className="text-teal-300/80 font-bold uppercase tracking-widest text-sm mt-1">
                  Registered Student
                </Typography>
              </Box>
              
              <Box className="flex items-center gap-2 mt-4 sm:mt-6">
                <Button 
                  onClick={() => setIsEditingEmail(true)}
                  className="bg-white/5 hover:bg-white/10 text-indigo-300 border border-white/10 rounded-xl px-4 py-2 font-bold backdrop-blur-md transition-all"
                >
                  <Edit fontSize="small" className="mr-2" /> Edit Email
                </Button>
              </Box>
            </Box>
          </Box>
        </motion.div>

        <Grid container spacing={4}>
          {/* Left Column: Academic Info */}
          <Grid item xs={12} md={5}>
            <motion.div variants={itemVariants} className="h-full">
              <LegendaryCard className="p-8 h-full relative group">
                <Box className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-colors duration-500" />
                <Typography variant="h6" className="font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
                  <Badge className="text-teal-400" /> Personal & Academic Info
                </Typography>
                
                <Box className="flex flex-col gap-6">
                  <Box>
                    <Typography className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Enrollment Number</Typography>
                    <Typography className="text-white font-mono text-lg font-medium bg-black/20 p-3 rounded-xl border border-white/5 inline-block">
                      {studentData?.enrollmentNo}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Phone Number</Typography>
                    <Box className="flex items-center gap-3 bg-black/20 p-4 rounded-xl border border-white/5">
                      <Phone className="text-emerald-400" />
                      <Typography className="text-white font-mono font-medium">{studentData?.phoneNo || 'Not provided'}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Department</Typography>
                    <Box className="flex items-center gap-3 bg-black/20 p-4 rounded-xl border border-white/5">
                      <Business className="text-purple-400" />
                      <Typography className="text-white font-bold">{studentData?.department?.name || studentData?.departmentName}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Gender</Typography>
                    <Box className="flex items-center gap-3 bg-black/20 p-4 rounded-xl border border-white/5">
                      <Person className="text-blue-400" />
                      <Typography className="text-white font-bold">{studentData?.gender || 'Not Specified'}</Typography>
                    </Box>
                  </Box>
                </Box>
              </LegendaryCard>
            </motion.div>
          </Grid>

          {/* Right Column: Security & Preferences */}
          <Grid item xs={12} md={7}>
            <motion.div variants={itemVariants} className="h-full">
              <LegendaryCard className="p-8 h-full relative group">
                <Box className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-500" />
                <Typography variant="h6" className="font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
                  <Lock className="text-indigo-400" /> Account & Security
                </Typography>

                <Box className="flex flex-col gap-4">
                  {/* Email Block */}
                  <Box className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-black/20 rounded-2xl border border-white/5 hover:border-white/10 transition-colors gap-4">
                    <Box className="flex items-center gap-4">
                      <Box className="p-3 bg-indigo-500/10 rounded-xl">
                        <Email className="text-indigo-400" />
                      </Box>
                      <Box>
                        <Typography className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Primary Email</Typography>
                        <Typography className="text-white font-medium">{studentData?.email || user?.email}</Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Password Block */}
                  <Box className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-black/20 rounded-2xl border border-white/5 hover:border-white/10 transition-colors gap-4">
                    <Box className="flex items-center gap-4">
                      <Box className="p-3 bg-rose-500/10 rounded-xl">
                        <Key className="text-rose-400" />
                      </Box>
                      <Box>
                        <Typography className="text-white font-bold">Password</Typography>
                        <Typography className="text-indigo-200/60 text-sm">Secure your account</Typography>
                      </Box>
                    </Box>
                    <Button 
                      onClick={() => setIsChangingPassword(true)}
                      variant="contained" 
                      className="bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20"
                    >
                      Update Password
                    </Button>
                  </Box>
                </Box>
                
                <Divider className="bg-white/10 my-6" />

                <Box className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <Box className="flex items-center gap-4">
                    <Box className="p-3 bg-teal-500/10 rounded-xl">
                      <DarkMode className="text-teal-400" />
                    </Box>
                    <Box>
                      <Typography className="text-white font-bold">Dark Mode</Typography>
                      <Typography className="text-indigo-200/60 text-sm">Toggle dark theme dashboard</Typography>
                    </Box>
                  </Box>
                  <Switch checked={darkMode} onChange={e => handleThemeChange(e.target.checked)} color="primary" />
                </Box>

              </LegendaryCard>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>

      {/* Edit Email Dialog */}
      {isEditingEmail && (
        <Box className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Box className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl relative overflow-hidden bg-slate-900/90">
            <Typography variant="h5" className="text-white font-bold mb-2">Change Email Address</Typography>
            <Typography className="text-slate-400 text-sm mb-6">
              A verification link will be sent to your new email. Your email will only be updated after you click the link.
            </Typography>

            {editMessage && (
              <Box className={`p-4 rounded-xl mb-6 border ${editMessage.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                <Typography className="text-sm font-medium">{editMessage.text}</Typography>
              </Box>
            )}

            <Box className="mb-6">
              <Typography className="text-white text-sm font-bold mb-2">New Email Address</Typography>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-400 transition-colors"
                placeholder="new.email@example.com"
              />
            </Box>

            <Box className="flex gap-4">
              <button
                onClick={() => {
                  setIsEditingEmail(false);
                  setEditMessage(null);
                  setNewEmail('');
                }}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateEmail}
                disabled={editLoading}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                {editLoading ? 'Sending...' : 'Send Link'}
              </button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Change Password Dialog */}
      <Dialog open={isChangingPassword} onClose={() => !passLoading && setIsChangingPassword(false)} PaperProps={{ className: "bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl min-w-[400px]" }}>
        <DialogTitle className="font-bold text-white border-b border-white/10 flex items-center gap-2 p-6">
          <Key className="text-indigo-400"/> Change Password
        </DialogTitle>
        <DialogContent className="p-6">
          {passSuccess ? (
            <Alert severity="success" className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 rounded-xl">
              Password updated successfully!
            </Alert>
          ) : (
            <Box className="flex flex-col gap-5 mt-2">
              {passError && (
                <Alert severity="error" className="bg-red-500/20 text-red-200 border border-red-500/30 rounded-xl">
                  {passError}
                </Alert>
              )}
              <TextField 
                label="Current Password" 
                type="password"
                variant="filled" 
                value={passwords.current} 
                onChange={e => setPasswords({...passwords, current: e.target.value})}
                InputProps={{ className: "text-white bg-white/5 hover:bg-white/10 rounded-xl", disableUnderline: true }}
                InputLabelProps={{ className: "text-indigo-300" }}
              />
              <TextField 
                label="New Password" 
                type="password"
                variant="filled" 
                value={passwords.new} 
                onChange={e => setPasswords({...passwords, new: e.target.value})}
                InputProps={{ className: "text-white bg-white/5 hover:bg-white/10 rounded-xl", disableUnderline: true }}
                InputLabelProps={{ className: "text-indigo-300" }}
              />
              <TextField 
                label="Confirm New Password" 
                type="password"
                variant="filled" 
                value={passwords.confirm} 
                onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                InputProps={{ className: "text-white bg-white/5 hover:bg-white/10 rounded-xl", disableUnderline: true }}
                InputLabelProps={{ className: "text-indigo-300" }}
              />
            </Box>
          )}
        </DialogContent>
        {!passSuccess && (
          <DialogActions className="p-6 border-t border-white/10 bg-black/20">
            <Button onClick={() => setIsChangingPassword(false)} className="text-indigo-300 hover:bg-white/5 rounded-lg px-4" disabled={passLoading}>Cancel</Button>
            <Button onClick={handleChangePassword} variant="contained" disabled={passLoading} className="bg-indigo-500 hover:bg-indigo-600 font-bold rounded-lg px-6 shadow-lg shadow-indigo-500/20">
              {passLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </PageWrapper>
  );
};
