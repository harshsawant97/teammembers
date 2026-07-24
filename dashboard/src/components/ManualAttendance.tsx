import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Grid, TextField, MenuItem, Button, Chip, Avatar } from '@mui/material';
import { FactCheck, CheckCircle, Cancel, Person } from '@mui/icons-material';
import axios from 'axios';
import { PageWrapper } from './PageWrapper';
import { LegendaryCard } from './LegendaryCard';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const ManualAttendance: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [classRes, sessionRes, studentRes] = await Promise.all([
        axios.get('/api/v1/classes', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        axios.get('/api/v1/sessions', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        axios.get('/api/v1/students', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      setClasses(classRes.data);
      setSessions(sessionRes.data);
      setStudents(studentRes.data);
      
      if (classRes.data.length > 0) {
        // Optionally default to first semester / class
        const firstSem = classRes.data[0].semester;
        setSelectedSemester(firstSem);
        const firstClass = classRes.data.find((c: any) => c.semester === firstSem);
        if (firstClass) {
          setSelectedClassId(firstClass.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleAttendance = async (studentId: string, currentStatus: boolean) => {
    if (!selectedSessionId) return;
    
    setActionLoading(studentId);
    try {
      const newStatus = currentStatus ? 'ABSENT' : 'PRESENT';
      await axios.post('/api/v1/attendance/manual', {
        sessionId: selectedSessionId,
        studentId,
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update local state to reflect change instantly
      setSessions(prev => prev.map(s => {
        if (s.id === selectedSessionId) {
          const newAtt = [...s.attendance];
          if (newStatus === 'PRESENT') {
            newAtt.push({ studentId, student: students.find(st => st.id === studentId) });
          } else {
            const idx = newAtt.findIndex((a: any) => a.studentId === studentId);
            if (idx !== -1) newAtt.splice(idx, 1);
          }
          return { ...s, attendance: newAtt };
        }
        return s;
      }));
    } catch (err) {
      console.error('Failed to toggle attendance', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <PageWrapper className="flex h-screen items-center justify-center bg-slate-900 w-full">
        <CircularProgress className="text-indigo-400" />
      </PageWrapper>
    );
  }

  const classSessions = sessions.filter(s => s.classId === selectedClassId);
  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  
  // Ensure we select a session automatically if none selected but available
  if (classSessions.length > 0 && !selectedSessionId) {
    setSelectedSessionId(classSessions[0].id);
  } else if (classSessions.length === 0 && selectedSessionId) {
    setSelectedSessionId('');
  }

  const uniqueSemesters = Array.from(new Set(classes.map(c => c.semester).filter(Boolean))).sort();
  const filteredClasses = classes.filter(c => c.semester === selectedSemester);

  const filteredStudents = students.filter(s => {
    const term = searchQuery.toLowerCase();
    return s.firstName?.toLowerCase().includes(term) || 
           s.lastName?.toLowerCase().includes(term) || 
           s.enrollmentNo?.toLowerCase().includes(term);
  });

  return (
    <PageWrapper className="p-4 md:p-8 min-h-screen bg-slate-900 w-full relative overflow-hidden flex flex-col items-center">
      <Box className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      
      <Box className="w-full max-w-6xl relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Typography variant="h3" className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300 drop-shadow-lg flex items-center gap-4">
            <FactCheck fontSize="large" className="text-indigo-400" />
            Manual Attendance
          </Typography>
          <Typography className="text-slate-400 mt-2 text-lg">
            Override and correct student attendance records manually.
          </Typography>
        </motion.div>

        <LegendaryCard className="p-6 mb-8 relative overflow-hidden group">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Select Semester</Typography>
              <TextField
                select
                fullWidth
                value={selectedSemester}
                onChange={e => {
                  setSelectedSemester(e.target.value);
                  setSelectedClassId('');
                  setSelectedSessionId('');
                }}
                variant="outlined"
                InputProps={{ className: 'text-white bg-black/20 rounded-xl' }}
                SelectProps={{ MenuProps: { PaperProps: { className: "bg-slate-800 text-white" } } }}
                sx={{ '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}
              >
                {uniqueSemesters.map((sem: any) => (
                  <MenuItem key={sem} value={sem}>{sem}</MenuItem>
                ))}
                {uniqueSemesters.length === 0 && <MenuItem disabled value="">No semesters found</MenuItem>}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Select Subject</Typography>
              <TextField
                select
                fullWidth
                value={selectedClassId}
                onChange={e => {
                  setSelectedClassId(e.target.value);
                  setSelectedSessionId('');
                }}
                variant="outlined"
                disabled={!selectedSemester}
                InputProps={{ className: 'text-white bg-black/20 rounded-xl' }}
                SelectProps={{ MenuProps: { PaperProps: { className: "bg-slate-800 text-white" } } }}
                sx={{ '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}
              >
                {selectedSemester && filteredClasses.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MenuItem>
                ))}
                {(!selectedSemester || filteredClasses.length === 0) && <MenuItem disabled value="">No subjects available</MenuItem>}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Select Session</Typography>
              <TextField
                select
                fullWidth
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
                variant="outlined"
                disabled={classSessions.length === 0}
                InputProps={{ className: 'text-white bg-black/20 rounded-xl' }}
                SelectProps={{ MenuProps: { PaperProps: { className: "bg-slate-800 text-white" } } }}
                sx={{ '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}
              >
                {classSessions.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {new Date(s.startTime).toLocaleDateString()} - {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </MenuItem>
                ))}
                {classSessions.length === 0 && <MenuItem disabled value="">No sessions</MenuItem>}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Search Student</Typography>
              <TextField
                fullWidth
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Name or Enrollment No"
                variant="outlined"
                InputProps={{ className: 'text-white bg-black/20 rounded-xl' }}
                sx={{ '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}
              />
            </Grid>
          </Grid>
        </LegendaryCard>

        {selectedSessionId ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredStudents.map(student => {
                const isPresent = selectedSession?.attendance?.some((a: any) => a.studentId === student.id);
                const isLoading = actionLoading === student.id;

                return (
                  <motion.div key={student.id} variants={itemVariants} layout exit={{ opacity: 0, scale: 0.9 }}>
                    <Box className={`p-6 rounded-[2rem] border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full ${isPresent ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50' : 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50'}`}>
                      <Box className="flex items-start justify-between mb-4">
                        <Box className="flex items-center gap-3">
                          <Avatar className={`font-black ${isPresent ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {student.firstName[0]}
                          </Avatar>
                          <Box>
                            <Typography className="font-bold text-white text-lg leading-tight">
                              {student.firstName} {student.lastName}
                            </Typography>
                            <Typography className="text-slate-400 text-sm font-mono mt-1">
                              {student.enrollmentNo}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Box className="flex items-center justify-between mt-2">
                        <Chip 
                          icon={isPresent ? <CheckCircle /> : <Cancel />}
                          label={isPresent ? "PRESENT" : "ABSENT"} 
                          size="small"
                          className={`font-bold ${isPresent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}
                        />
                        <Button
                          variant="contained"
                          disabled={isLoading}
                          onClick={() => handleToggleAttendance(student.id, isPresent)}
                          className={`rounded-xl font-bold shadow-lg transition-transform hover:scale-105 ${isPresent ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                        >
                          {isLoading ? <CircularProgress size={20} className="text-white" /> : (isPresent ? 'Mark Absent' : 'Mark Present')}
                        </Button>
                      </Box>
                    </Box>
                  </motion.div>
                );
              })}
              {filteredStudents.length === 0 && (
                <Box className="col-span-full p-12 text-center text-slate-400">
                  <Person className="text-6xl mb-4 opacity-50" />
                  <Typography variant="h6">No students found matching your search.</Typography>
                </Box>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <Box className="p-12 text-center bg-black/20 border border-white/5 rounded-3xl mt-8">
            <FactCheck className="text-6xl text-slate-600 mb-4" />
            <Typography variant="h6" className="text-slate-400">Please select a class and session to manage attendance.</Typography>
          </Box>
        )}
      </Box>
    </PageWrapper>
  );
};
