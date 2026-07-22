import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, CircularProgress, Chip } from '@mui/material';
import { School, CheckCircle, Cancel, AccessTime, CalendarMonth } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Attendance {
  id: string;
  studentId: string;
  timestamp: string;
  status: string;
}

interface Session {
  id: string;
  status: string;
  startTime: string;
  endTime?: string;
  class: {
    id: string;
    name: string;
    courseCode: string;
  };
  attendance: Attendance[];
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Removed navigate block since App.tsx handles routing protection now

    const fetchMyAttendance = async () => {
      try {
        // Fetch all sessions and filter down to the ones this student attended
        const res = await axios.get('/api/v1/sessions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSessions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyAttendance();
  }, [user]);

  if (loading) {
    return (
      <Box className="flex h-screen items-center justify-center bg-slate-900 w-full">
        <CircularProgress className="text-teal-400" />
      </Box>
    );
  }

  // Calculate metrics
  const totalClasses = sessions.length;
  // Student is present if their studentId is found in the session's attendance array
  const attendedSessions = sessions.filter(s => s.attendance.some(a => a.studentId === user?.studentId));
  const totalAttended = attendedSessions.length;
  const attendancePercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

  // Subject Breakdown
  const subjectStats: { [courseCode: string]: { name: string, total: number, attended: number } } = {};
  
  sessions.forEach(session => {
    const code = session.class.courseCode;
    if (!subjectStats[code]) {
      subjectStats[code] = { name: session.class.name, total: 0, attended: 0 };
    }
    subjectStats[code].total += 1;
    if (session.attendance.some(a => a.studentId === user?.studentId)) {
      subjectStats[code].attended += 1;
    }
  });

  const subjectArray = Object.values(subjectStats);

  return (
    <Box className="p-4 md:p-8 min-h-screen relative overflow-hidden bg-slate-900 w-full">
      <Box className="absolute top-[10%] left-[20%] w-[30rem] h-[30rem] bg-teal-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      
      <Grid container spacing={4} className="relative z-10 max-w-6xl mx-auto">
        <Grid item xs={12}>
          <Box className="glass-panel rounded-[2rem] p-8 flex justify-between items-center border border-white/10 bg-white/5 backdrop-blur-md">
            <Box>
              <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-300 tracking-tight flex items-center gap-4">
                <School fontSize="large" className="text-teal-400" />
                Attendance Overview
              </Typography>
              <Typography variant="subtitle1" className="text-teal-100/70 mt-2 font-medium">
                Track your real-time presence across all courses.
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box className="glass-panel rounded-3xl p-8 border border-white/10 h-full flex flex-col justify-center items-center relative overflow-hidden bg-white/5">
            <Box className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl" />
            <Typography className="text-teal-100 font-bold mb-4 uppercase tracking-widest text-sm z-10">Overall Attendance</Typography>
            
            <Box className="relative flex items-center justify-center mb-4 z-10">
              <CircularProgress 
                variant="determinate" 
                value={100} 
                size={180} 
                thickness={4} 
                className="text-white/10 absolute" 
              />
              <CircularProgress 
                variant="determinate" 
                value={attendancePercentage} 
                size={180} 
                thickness={4} 
                className={`${attendancePercentage >= 75 ? 'text-teal-400' : attendancePercentage >= 50 ? 'text-amber-400' : 'text-red-400'}`}
                sx={{ strokeLinecap: 'round' }}
              />
              <Box className="absolute flex flex-col items-center justify-center">
                <Typography variant="h3" className="font-bold text-white">{attendancePercentage}%</Typography>
              </Box>
            </Box>
            
            <Typography className="text-teal-200/80 font-medium z-10 text-center mb-6">
              You have attended {totalAttended} out of {totalClasses} classes.
            </Typography>

            {/* Subject Breakdown */}
            {subjectArray.length > 0 && (
              <Box className="w-full z-10 mt-4 border-t border-white/10 pt-6">
                <Typography className="text-white font-bold mb-4">Subject Breakdown</Typography>
                <Box className="flex flex-col gap-3">
                  {subjectArray.map(sub => {
                    const pct = Math.round((sub.attended / sub.total) * 100);
                    return (
                      <Box key={sub.name} className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <Box className="flex justify-between items-center mb-2">
                          <Typography className="text-teal-100 text-sm font-bold truncate max-w-[200px]">{sub.name}</Typography>
                          <Typography className="text-white text-sm font-mono">{pct}%</Typography>
                        </Box>
                        <Box className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <Box 
                            className={`h-full ${pct >= 75 ? 'bg-teal-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} 
                            style={{ width: `${pct}%` }} 
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={8}>
          <Box className="glass-panel rounded-3xl p-8 border border-white/10 h-full bg-white/5">
            <Typography variant="h5" className="font-bold text-white mb-6 flex items-center gap-2">
              <CalendarMonth className="text-teal-400" /> Recent Classes
            </Typography>

            <Box className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2">
              {sessions.slice(0, 5).map(session => {
                const wasPresent = session.attendance.some(a => a.studentId === user?.studentId);
                const attRecord = session.attendance.find(a => a.studentId === user?.studentId);
                
                return (
                  <Box key={session.id} className="flex justify-between items-center p-5 rounded-2xl border border-white/5 bg-black/20 hover:bg-black/40 transition-colors">
                    <Box>
                      <Typography className="text-white font-bold text-lg">{session.class.name}</Typography>
                      <Typography className="text-teal-200/60 font-mono text-sm">{session.class.courseCode}</Typography>
                      <Typography className="text-slate-400 text-sm mt-2 flex items-center gap-1">
                        <AccessTime fontSize="small" /> 
                        {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    
                    <Box className="flex flex-col items-end gap-2">
                      {wasPresent ? (
                        <>
                          <Chip 
                            icon={<CheckCircle className="!text-emerald-300" />} 
                            label="PRESENT" 
                            className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-5 text-lg"
                          />
                          <Typography className="text-emerald-200/50 text-xs">
                            Marked at {new Date(attRecord?.timestamp || '').toLocaleTimeString()}
                          </Typography>
                        </>
                      ) : (
                        <Chip 
                          icon={<Cancel className="!text-red-300" />} 
                          label="ABSENT" 
                          className="bg-red-500/20 text-red-300 border border-red-500/30 font-bold px-2 py-5 text-lg opacity-80"
                        />
                      )}
                    </Box>
                  </Box>
                );
              })}
              
              {sessions.length > 5 && (
                <Box className="text-center mt-2">
                  <Typography className="text-teal-400 text-sm font-bold cursor-pointer hover:underline" onClick={() => window.location.href='/student/classes'}>
                    View all in My Classes →
                  </Typography>
                </Box>
              )}
              
              {sessions.length === 0 && (
                <Box className="text-center p-8">
                  <Typography className="text-slate-400 italic">No classes have been recorded yet.</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

      </Grid>
    </Box>
  );
};
