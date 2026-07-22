import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, CircularProgress, Divider, Switch } from '@mui/material';
import { Person, Email, Badge, Business, DarkMode } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('setting_darkMode') !== 'false');

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

  if (loading) {
    return (
      <Box className="flex h-screen items-center justify-center bg-slate-900 w-full">
        <CircularProgress className="text-teal-400" />
      </Box>
    );
  }

  return (
    <Box className="p-4 md:p-8 min-h-screen relative overflow-hidden bg-slate-900 w-full">
      <Box className="absolute top-[20%] right-[10%] w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      
      <Grid container spacing={4} className="relative z-10 max-w-4xl mx-auto">
        <Grid item xs={12}>
          <Box className="glass-panel rounded-[2rem] p-8 border border-white/10 bg-white/5 backdrop-blur-md">
            <Typography variant="h4" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-300 tracking-tight flex items-center gap-4 mb-8">
              <Person fontSize="large" className="text-teal-400" />
              My Profile
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box className="bg-black/20 p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                  <Box className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {studentData?.firstName?.[0]}{studentData?.lastName?.[0]}
                  </Box>
                  <Box>
                    <Typography className="text-white font-bold text-xl">{studentData?.firstName} {studentData?.lastName}</Typography>
                    <Typography className="text-teal-200/70 text-sm font-medium">Registered Student</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box className="bg-black/20 p-6 rounded-2xl border border-white/5 h-full flex flex-col justify-center">
                  <Box className="flex items-center gap-3 mb-4">
                    <Email className="text-indigo-400" />
                    <Box>
                      <Typography className="text-slate-400 text-xs uppercase tracking-wider font-bold">Email Address</Typography>
                      <Typography className="text-white font-medium">{studentData?.email || user?.email}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box className="bg-black/20 p-6 rounded-2xl border border-white/5 h-full">
                  <Box className="flex items-center gap-3 mb-4">
                    <Badge className="text-teal-400" />
                    <Box>
                      <Typography className="text-slate-400 text-xs uppercase tracking-wider font-bold">Enrollment Number</Typography>
                      <Typography className="text-white font-medium font-mono">{studentData?.enrollmentNo}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box className="bg-black/20 p-6 rounded-2xl border border-white/5 h-full">
                  <Box className="flex items-center gap-3 mb-4">
                    <Business className="text-purple-400" />
                    <Box>
                      <Typography className="text-slate-400 text-xs uppercase tracking-wider font-bold">Department</Typography>
                      <Typography className="text-white font-medium">{studentData?.department?.name || studentData?.departmentName}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>

            </Grid>

            <Divider className="bg-white/10 my-8" />

            <Typography variant="h6" className="font-bold text-white mb-6">Preferences</Typography>
            
            <Box className="flex justify-between items-center p-5 bg-white/5 rounded-xl border border-white/10">
              <Box className="flex items-center gap-3">
                <DarkMode className="text-indigo-300" />
                <Box>
                  <Typography className="text-white font-bold">Dark Mode</Typography>
                  <Typography className="text-indigo-200 text-sm">Force dark theme across the dashboard</Typography>
                </Box>
              </Box>
              <Switch checked={darkMode} onChange={e => handleThemeChange(e.target.checked)} color="primary" />
            </Box>

          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
