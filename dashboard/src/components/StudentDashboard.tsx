import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, CircularProgress, Chip } from '@mui/material';
import { School, CheckCircle, Cancel, AccessTime, CalendarMonth } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, animate, useMotionValue, useTransform } from 'framer-motion';
import { PageWrapper } from './PageWrapper';
import { LegendaryCard } from './LegendaryCard';

const AnimatedNumber = ({ value, suffix = '' }: { value: number, suffix?: string }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const display = useTransform(rounded, (latest) => `${latest}${suffix}`);

  useEffect(() => {
    const animation = animate(count, value, { duration: 2, type: 'spring', bounce: 0.1 });
    return animation.stop;
  }, [value]);

  return <motion.span>{display}</motion.span>;
};

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
    semester?: string;
  };
  attendance: Attendance[];
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>('All');

  useEffect(() => {
    // Removed navigate block since App.tsx handles routing protection now

    const fetchMyAttendance = async () => {
      try {
        // Fetch all sessions and filter down to the ones this student attended
        const res = await axios.get('/api/v1/sessions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        const rawSessions: Session[] = res.data;
        setSessions(rawSessions);
        
        // Find latest semester by default if available
        const semesters = Array.from(new Set(rawSessions.map(s => s.class.semester).filter(Boolean)));
        if (semesters.length > 0) {
          // Sort semesters alphabetically and pick the highest/latest, or just the first one
          setSelectedSemester(semesters[0] || 'All');
        }
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

  // Filter by semester
  const filteredSessions = selectedSemester === 'All' 
    ? sessions 
    : sessions.filter(s => s.class.semester === selectedSemester);

  const uniqueSemesters = Array.from(new Set(sessions.map(s => s.class.semester).filter(Boolean)));

  // Calculate metrics
  const totalClasses = filteredSessions.length;
  // Student is present if their studentId is found in the session's attendance array
  const attendedSessions = filteredSessions.filter(s => s.attendance.some(a => a.studentId === user?.studentId));
  const totalAttended = attendedSessions.length;
  const attendancePercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

  // Subject Breakdown
  const subjectStats: { [courseCode: string]: { name: string, total: number, attended: number } } = {};
  
  filteredSessions.forEach(session => {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <PageWrapper className="p-4 md:p-8 min-h-screen relative overflow-hidden bg-slate-900 w-full">
      <Box className="absolute top-[10%] left-[20%] w-[30rem] h-[30rem] bg-emerald-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      <Box className="absolute bottom-[10%] right-[10%] w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 max-w-7xl mx-auto">
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <LegendaryCard className="p-8 flex justify-between items-center bg-white/5 backdrop-blur-md shadow-2xl">
            <Box>
              <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-300 tracking-tight flex items-center gap-4">
                <School fontSize="large" className="text-teal-400" />
                Attendance Overview
              </Typography>
              <Typography variant="subtitle1" className="text-teal-100/70 mt-2 font-medium">
                Track your real-time presence across all courses.
              </Typography>
            </Box>
            </LegendaryCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <LegendaryCard className="p-8 h-full flex flex-col justify-center items-center relative overflow-hidden bg-white/5">
            <Box className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl" />
            
            <Box className="flex justify-between items-center w-full mb-8 z-10">
              <Typography className="text-teal-100 font-black uppercase tracking-widest text-sm bg-teal-500/10 px-4 py-2 rounded-xl border border-teal-500/20">Overall</Typography>
              {uniqueSemesters.length > 0 && (
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="bg-black/40 text-white font-bold px-4 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-teal-400 text-sm shadow-xl cursor-pointer hover:bg-black/60 transition-colors"
                >
                  <option value="All">All Semesters</option>
                  {uniqueSemesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              )}
            </Box>
            
            <Box className="relative flex items-center justify-center mb-6 z-10">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  {/* Background Circle (Red for Absent) */}
                  <CircularProgress 
                    variant="determinate" 
                    value={100} 
                    size={220} 
                    thickness={5} 
                    className="text-red-500 shadow-2xl rounded-full" 
                  />
                  {/* Foreground Circle (Green for Present) */}
                  <CircularProgress 
                    variant="determinate" 
                    value={attendancePercentage} 
                    size={220} 
                    thickness={5} 
                    className="text-emerald-400 absolute left-0"
                    sx={{ strokeLinecap: 'round' }}
                  />
                  <Box className="absolute inset-0 flex flex-col items-center justify-center">
                    <Typography variant="h2" className="font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400"><AnimatedNumber value={attendancePercentage} suffix="%" /></Typography>
                    <Typography className="text-teal-200/60 font-bold tracking-widest uppercase text-xs mt-1">Present</Typography>
                  </Box>
                </Box>
              </motion.div>
            </Box>
            
            <Box className="flex gap-4 w-full z-10 mb-8">
              <Box className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_8px_32px_0_rgba(16,185,129,0.1)]">
                <Typography className="text-emerald-400 text-3xl font-black drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"><AnimatedNumber value={totalAttended} /></Typography>
                <Typography className="text-emerald-200/70 text-xs font-bold uppercase tracking-widest mt-1">Attended</Typography>
              </Box>
              <Box className="flex-1 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_8px_32px_0_rgba(239,68,68,0.1)]">
                <Typography className="text-red-400 text-3xl font-black drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]"><AnimatedNumber value={totalClasses - totalAttended} /></Typography>
                <Typography className="text-red-200/70 text-xs font-bold uppercase tracking-widest mt-1">Missed</Typography>
              </Box>
            </Box>

            {/* Subject Breakdown */}
            {subjectArray.length > 0 && (
              <Box className="w-full z-10 mt-4 border-t border-white/10 pt-6">
                <Typography className="text-white font-bold mb-4">Subject Breakdown</Typography>
                <Box className="flex flex-col gap-3">
                  {subjectArray.map((sub, idx) => {
                    const pct = Math.round((sub.attended / sub.total) * 100);
                    return (
                      <motion.div 
                        key={sub.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (idx * 0.1) }}
                        className="bg-black/20 p-3 rounded-xl border border-white/5"
                      >
                        <Box className="flex justify-between items-center mb-2">
                          <Typography className="text-teal-100 text-sm font-bold truncate max-w-[200px]">{sub.name}</Typography>
                          <Typography className="text-white text-sm font-mono">{pct}%</Typography>
                        </Box>
                        <Box className="w-full h-3 bg-red-500/20 rounded-full overflow-hidden">
                          <Box 
                            className={`h-full ${pct >= 75 ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : pct >= 50 ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-red-400 shadow-[0_0_10px_#f87171]'}`} 
                          />
                        </Box>
                      </motion.div>
                    );
                  })}
                </Box>
              </Box>
            )}
            </LegendaryCard>
          </Grid>

          <Grid item xs={12} md={8}>
            <LegendaryCard className="p-8 h-full bg-white/5">
            <Typography variant="h5" className="font-bold text-white mb-6 flex items-center gap-2">
              <CalendarMonth className="text-teal-400" /> Recent Classes
            </Typography>

            <Box className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2">
              {filteredSessions.slice(0, 5).map((session, idx) => {
                const wasPresent = session.attendance.some(a => a.studentId === user?.studentId);
                const attRecord = session.attendance.find(a => a.studentId === user?.studentId);
                
                return (
                  <motion.div 
                    key={session.id} 
                    initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 + (idx * 0.1) }}
                    whileHover={{ scale: 1.02, x: -5 }}
                    className="flex justify-between items-center p-5 rounded-2xl border border-white/5 bg-black/20 hover:bg-black/40 transition-colors shadow-lg"
                  >
                    <Box>
                      <Typography className="text-white font-extrabold text-xl mb-1">{session.class.name}</Typography>
                      <Typography className="text-teal-300 font-mono text-sm bg-teal-500/10 inline-block px-2 py-1 rounded-md">{session.class.courseCode}</Typography>
                      <Typography className="text-slate-400 text-sm mt-3 flex items-center gap-1 font-medium">
                        <AccessTime fontSize="small" className="opacity-70" /> 
                        {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    
                    <Box className="flex flex-col items-end gap-2">
                      {wasPresent ? (
                        <Box className="text-right">
                          <Chip 
                            icon={<CheckCircle className="!text-emerald-400" />} 
                            label="PRESENT" 
                            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black tracking-widest px-4 py-6 text-lg shadow-[0_0_15px_rgba(52,211,153,0.15)] rounded-2xl"
                          />
                          <Typography className="text-emerald-200/50 text-xs mt-2 font-medium">
                            Marked at {new Date(attRecord?.timestamp || '').toLocaleTimeString()}
                          </Typography>
                        </Box>
                      ) : (
                        <Chip 
                          icon={<Cancel className="!text-red-400" />} 
                          label="ABSENT" 
                          className="bg-red-500/10 text-red-400 border border-red-500/30 font-black tracking-widest px-4 py-6 text-lg shadow-[0_0_15px_rgba(248,113,113,0.15)] rounded-2xl"
                        />
                      )}
                    </Box>
                  </motion.div>
                );
              })}
              
              {filteredSessions.length > 5 && (
                <Box className="text-center mt-2">
                  <Typography className="text-teal-400 text-sm font-bold cursor-pointer hover:underline" onClick={() => window.location.href='/student/classes'}>
                    View all in My Classes →
                  </Typography>
                </Box>
              )}
              
              {filteredSessions.length === 0 && (
                <Box className="text-center p-8">
                  <Typography className="text-slate-400 italic">No classes have been recorded yet.</Typography>
                </Box>
              )}
            </Box>
            </LegendaryCard>
          </Grid>

        </Grid>
      </motion.div>
    </PageWrapper>
  );
};
