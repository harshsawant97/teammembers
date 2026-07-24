import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Grid, Chip } from '@mui/material';
import { History, Class as ClassIcon, AccessTime, ArrowBackIosNew, CheckCircle, Cancel } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

interface Session {
  id: string;
  status: string;
  startTime: string;
  endTime?: string;
  class: {
    id: string;
    name: string;
    courseCode: string;
    semester: string;
  };
  attendance: { studentId: string, timestamp: string }[];
}

interface GroupedClass {
  classId: string;
  name: string;
  courseCode: string;
  semester: string;
  sessions: Session[];
}

export const StudentClassHistory: React.FC = () => {
  const { user } = useAuth();
  const [groupedClasses, setGroupedClasses] = useState<GroupedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation State
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<GroupedClass | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await axios.get('/api/v1/sessions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const rawSessions: Session[] = res.data;
        
        // Group by Class
        const grouped: { [key: string]: GroupedClass } = {};
        rawSessions.forEach(session => {
          const cid = session.class.id;
          if (!grouped[cid]) {
            grouped[cid] = {
              classId: cid,
              name: session.class.name,
              courseCode: session.class.courseCode,
              semester: session.class.semester || 'Semester 1',
              sessions: []
            };
          }
          grouped[cid].sessions.push(session);
        });
        
        const groupedArray = Object.values(grouped);
        setGroupedClasses(groupedArray);
        
        if (groupedArray.length > 0) {
          const uniqueSemesters = Array.from(new Set(groupedArray.map(c => c.semester)));
          setSelectedSemester(uniqueSemesters[0] as string);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch class history.');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const formatTimeSlot = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    const diffMs = end.getTime() - start.getTime();
    const hrs = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    return {
      dateString: start.toLocaleDateString(undefined, dateOptions),
      slotString: `${hrs} hr from ${start.toLocaleTimeString(undefined, timeOptions)} to ${end.toLocaleTimeString(undefined, timeOptions)}`
    };
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
      <Box className="absolute top-[10%] left-[20%] w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 max-w-6xl mx-auto">
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <motion.div variants={rowVariants} className="glass-panel rounded-[2rem] p-8 flex justify-between items-center border border-white/10 bg-white/5 backdrop-blur-md">
            <Box>
              <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-300 tracking-tight flex items-center gap-4">
                <History fontSize="large" className="text-teal-400" />
                My Classes
              </Typography>
              <Typography variant="subtitle1" className="text-teal-100/70 mt-2 font-medium">
                {selectedClass 
                  ? `Viewing Sessions for ${selectedClass.name}`
                  : "View your historical attendance across semesters."}
              </Typography>
            </Box>
            
            {selectedClass ? (
              <Box 
                onClick={() => {
                  setSelectedClass(null);
                  setFilterDate('');
                }}
                className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-colors"
              >
                <ArrowBackIosNew fontSize="small" className="text-indigo-300" />
                <Typography className="text-indigo-200 font-bold">
                  Back to Classes
                </Typography>
              </Box>
            ) : groupedClasses.length > 0 ? (
              <Box>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="bg-black/40 text-white font-bold px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:border-teal-400"
                >
                  {Array.from(new Set(groupedClasses.map(c => c.semester))).map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </Box>
              ) : null}
            </motion.div>
          </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" className="bg-red-500/20 text-red-200">{error}</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <motion.div variants={rowVariants} className="glass-panel rounded-[2rem] p-8 min-h-[500px] border border-white/10 bg-white/5">
            
            {/* LEVEL 1: SHOW ALL CLASSES FOR SELECTED SEMESTER */}
            {!selectedClass && (
              <Box>
                {groupedClasses.filter(c => c.semester === selectedSemester).length > 0 ? (
                  <Grid container spacing={3}>
                    {groupedClasses.filter(c => c.semester === selectedSemester).map(cls => (
                      <Grid item xs={12} md={4} key={cls.classId}>
                        <motion.div 
                          variants={rowVariants}
                          onClick={() => setSelectedClass(cls)}
                          className="bg-black/20 rounded-xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.03] border border-white/5 hover:border-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                        >
                          <Typography variant="h6" className="text-white font-bold flex items-center gap-2 mb-2">
                            <ClassIcon className="text-teal-400" />
                            {cls.name}
                          </Typography>
                          <Typography variant="body1" className="text-teal-200/70 mb-4 font-mono">
                            {cls.courseCode}
                          </Typography>
                          <Chip 
                            label={`${cls.sessions.length} Session${cls.sessions.length !== 1 ? 's' : ''}`} 
                            className="bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold"
                          />
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography className="text-slate-400 italic w-full text-center p-8">No classes found in this semester.</Typography>
                )}
              </Box>
            )}

            {/* LEVEL 2: SHOW SESSIONS FOR SELECTED CLASS */}
            {selectedClass && (
              <Box className="flex flex-col gap-4">
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="h6" className="text-white font-bold">Session History</Typography>
                  <Box className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-black/40 text-white font-bold px-4 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-teal-400"
                    />
                    {filterDate && (
                      <Typography 
                        className="text-teal-300 cursor-pointer text-sm font-bold hover:text-white" 
                        onClick={() => setFilterDate('')}
                      >
                        Clear
                      </Typography>
                    )}
                  </Box>
                </Box>

                {selectedClass.sessions
                  .filter(session => !filterDate || new Date(session.startTime).toLocaleDateString('en-CA') === filterDate)
                  .map(session => {
                  const timeInfo = formatTimeSlot(session.startTime, session.endTime);
                  const wasPresent = session.attendance.some(a => a.studentId === user?.studentId);
                  const attRecord = session.attendance.find(a => a.studentId === user?.studentId);

                  return (
                    <motion.div variants={rowVariants} key={session.id} className="bg-black/20 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center border border-white/5 hover:bg-black/40 transition-colors">
                      <Box>
                        <Typography variant="h6" className="text-white font-bold mb-2">
                          {timeInfo.dateString}
                        </Typography>
                        <Typography className="text-teal-200/80 flex items-center gap-2 font-medium bg-white/5 p-2 rounded-lg border border-white/10 w-fit">
                          <AccessTime fontSize="small" />
                          {timeInfo.slotString}
                        </Typography>
                      </Box>
                      
                      <Box className="flex flex-col items-end mt-4 md:mt-0">
                        {wasPresent ? (
                          <>
                            <Chip 
                              icon={<CheckCircle className="!text-emerald-300" />} 
                              label="PRESENT" 
                              className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-4 py-6 text-lg"
                            />
                            <Typography className="text-emerald-200/50 text-xs mt-2">
                              Marked at {new Date(attRecord?.timestamp || '').toLocaleTimeString()}
                            </Typography>
                          </>
                        ) : (
                          <Chip 
                            icon={<Cancel className="!text-red-300" />} 
                            label="ABSENT" 
                            className="bg-red-500/20 text-red-300 border border-red-500/30 font-bold px-4 py-6 text-lg opacity-80"
                          />
                        )}
                      </Box>
                    </motion.div>
                  );
                })}
                {selectedClass.sessions.filter(session => !filterDate || new Date(session.startTime).toLocaleDateString('en-CA') === filterDate).length === 0 && (
                  <Typography className="text-slate-400 italic w-full text-center p-8 bg-black/20 rounded-xl border border-white/5 mt-4">No sessions found for this date.</Typography>
                )}
              </Box>
            )}

          </motion.div>
        </Grid>
      </Grid>
      </motion.div>
    </Box>
  );
};
