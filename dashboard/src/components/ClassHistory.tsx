import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Grid, Chip } from '@mui/material';
import { History, Class as ClassIcon, AccessTime, ArrowBackIosNew } from '@mui/icons-material';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

interface Attendance {
  id: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    enrollmentNo: string;
  };
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
    semester: string;
  };
  attendance: Attendance[];
}

interface GroupedClass {
  classId: string;
  name: string;
  courseCode: string;
  semester: string;
  sessions: Session[];
}

export const ClassHistory: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [groupedClasses, setGroupedClasses] = useState<GroupedClass[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation State
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<GroupedClass | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await axios.get('/api/v1/sessions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const rawSessions: Session[] = res.data;
        setSessions(rawSessions);
        
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

        // Fetch all students to compute absentees
        const studentRes = await axios.get('/api/v1/students', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAllStudents(studentRes.data);
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
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000); // Default to 1 hr
    
    // Format: "1 hr from 11:00 AM to 12:00 PM"
    const diffMs = end.getTime() - start.getTime();
    const hrs = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    
    const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    return {
      dateString: start.toLocaleDateString(undefined, dateOptions),
      slotString: `${hrs} hr from ${start.toLocaleTimeString(undefined, timeOptions)} to ${end.toLocaleTimeString(undefined, timeOptions)}`
    };
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setSelectedSession(null);
    setFilterDate('');
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
  };

  if (loading) {
    return (
      <Box className="flex h-screen items-center justify-center">
        <CircularProgress className="text-indigo-400" />
      </Box>
    );
  }

  return (
    <Box className="p-4 md:p-8 min-h-screen relative overflow-hidden">
      <Box className="absolute top-[10%] left-[20%] w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10">
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <motion.div variants={rowVariants} className="glass-panel rounded-[2rem] p-8 flex justify-between items-center bg-white/5 backdrop-blur-md shadow-2xl border border-white/10">
            <Box>
              <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 tracking-tight flex items-center gap-4">
                <History fontSize="large" className="text-indigo-400" />
                Class History
              </Typography>
              <Typography variant="subtitle1" className="text-indigo-200 mt-2 font-medium">
                {selectedSession 
                  ? "Viewing Attendance Records" 
                  : selectedClass 
                    ? `Viewing Timing Slots for ${selectedClass.name}`
                    : "Select a Class to view past sessions."}
              </Typography>
            </Box>
            
            {(selectedClass || selectedSession) ? (
              <Box 
                onClick={selectedSession ? handleBackToSessions : handleBackToClasses}
                className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-colors"
              >
                <ArrowBackIosNew fontSize="small" className="text-indigo-300" />
                <Typography className="text-indigo-200 font-bold">
                  {selectedSession ? "Back to Slots" : "Back to Classes"}
                </Typography>
              </Box>
            ) : groupedClasses.length > 0 ? (
              <Box className="mt-4 md:mt-0">
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="bg-black/40 text-white font-bold px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:border-indigo-400"
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
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <motion.div variants={rowVariants} className="glass-panel rounded-[2rem] p-8 min-h-[500px] bg-white/5 border border-white/10">
            
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
                          className="glass-card rounded-xl p-6 cursor-pointer"
                        >
                          <Typography variant="h6" className="text-white font-bold flex items-center gap-2 mb-2">
                            <ClassIcon className="text-indigo-400" />
                            {cls.name}
                          </Typography>
                          <Typography variant="body1" className="text-indigo-200 mb-4 font-mono">
                            {cls.courseCode}
                          </Typography>
                          <Chip 
                            label={`${cls.sessions.length} Session${cls.sessions.length !== 1 ? 's' : ''}`} 
                            className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold shadow-lg"
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
            {selectedClass && !selectedSession && (
              <Box>
                <Box className="flex justify-between items-center mb-6">
                  <Typography variant="h6" className="text-white font-bold">Sessions</Typography>
                  <Box className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-black/40 text-white font-bold px-4 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-indigo-400"
                    />
                    {filterDate && (
                      <Typography 
                        className="text-indigo-300 cursor-pointer text-sm font-bold hover:text-white" 
                        onClick={() => setFilterDate('')}
                      >
                        Clear
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Grid container spacing={3}>
                  {selectedClass.sessions
                    .filter(session => !filterDate || new Date(session.startTime).toLocaleDateString('en-CA') === filterDate)
                    .map(session => {
                      const timeInfo = formatTimeSlot(session.startTime, session.endTime);
                  return (
                    <Grid item xs={12} md={6} key={session.id}>
                      <motion.div 
                        variants={rowVariants}
                        onClick={() => setSelectedSession(session)}
                        className="glass-card rounded-xl p-6 cursor-pointer"
                      >
                        <Box className="flex justify-between items-start mb-4">
                          <Typography variant="h6" className="text-white font-bold">
                            {timeInfo.dateString}
                          </Typography>
                          <Chip 
                            label={session.status} 
                            size="small" 
                            className={`font-bold ${session.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}
                          />
                        </Box>
                        
                        <Typography className="text-teal-200 flex items-center gap-2 font-medium bg-teal-500/10 p-3 rounded-lg border border-teal-500/20">
                          <AccessTime />
                          {timeInfo.slotString}
                        </Typography>
                        
                        <Typography className="text-slate-400 mt-4 text-sm font-medium">
                          {session.attendance.length} Students Attended
                        </Typography>
                      </motion.div>
                    </Grid>
                  );
                })}
                {selectedClass.sessions.filter(session => !filterDate || new Date(session.startTime).toLocaleDateString('en-CA') === filterDate).length === 0 && (
                  <Typography className="text-slate-400 italic w-full text-center p-8">No sessions found for this date.</Typography>
                )}
              </Grid>
              </Box>
            )}

            {/* LEVEL 3: SHOW ATTENDANCE FOR SELECTED SESSION */}
            {selectedSession && (
              <Box>
                <Box className="border-b border-white/10 pb-4 mb-6 flex justify-between items-center">
                  <Box>
                    <Typography variant="h5" className="font-bold text-white">
                      {selectedClass?.name} - Attendance
                    </Typography>
                    <Typography variant="subtitle2" className="text-indigo-200 mt-1">
                      {formatTimeSlot(selectedSession.startTime, selectedSession.endTime).dateString} | {formatTimeSlot(selectedSession.startTime, selectedSession.endTime).slotString}
                    </Typography>
                  </Box>
                  <Box className="flex gap-4">
                    <Chip 
                      label={`${new Set(selectedSession.attendance.map(a => a.student?.id)).size} Present`} 
                      className="bg-green-500/20 text-green-300 border border-green-500/30 font-bold px-2 py-5 text-lg"
                    />
                    <Chip 
                      label={`${allStudents.length - new Set(selectedSession.attendance.map(a => a.student?.id)).size} Absent`} 
                      className="bg-red-500/20 text-red-300 border border-red-500/30 font-bold px-2 py-5 text-lg"
                    />
                  </Box>
                </Box>
                
                {allStudents.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="p-4 text-indigo-200 font-semibold">Student Name</th>
                          <th className="p-4 text-indigo-200 font-semibold">Enrollment No.</th>
                          <th className="p-4 text-indigo-200 font-semibold">Marked At</th>
                          <th className="p-4 text-indigo-200 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Render Deduplicated Present Students */}
                        {Array.from(new Map(selectedSession.attendance.map(a => [a.student?.id, a])).values()).map(att => {
                          if (!att.student) return null;
                          return (
                            <motion.tr 
                              variants={rowVariants}
                              initial="hidden"
                              animate="show"
                              key={att.id} 
                              className="border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                              <td className="p-4 text-white font-medium flex items-center gap-3">
                                <Box className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs shadow-inner">
                                  {att.student.firstName?.[0]}{att.student.lastName?.[0]}
                                </Box>
                                {att.student.firstName} {att.student.lastName}
                              </td>
                              <td className="p-4 text-slate-300 font-mono">{att.student.enrollmentNo}</td>
                              <td className="p-4 text-slate-300">{new Date(att.timestamp).toLocaleTimeString()}</td>
                              <td className="p-4">
                                <Chip 
                                  label="PRESENT" 
                                  size="small" 
                                  className="bg-green-500/20 text-green-300 border border-green-500/30 font-bold"
                                />
                              </td>
                            </motion.tr>
                          );
                        })}

                        {/* Render Absent Students */}
                        {allStudents
                          .filter(s => !new Set(selectedSession.attendance.map(a => a.student?.id)).has(s.id))
                          .map(student => (
                            <motion.tr 
                              variants={rowVariants}
                              initial="hidden"
                              animate="show"
                              key={`absent-${student.id}`} 
                              className="border-b border-white/5 hover:bg-white/5 transition-colors opacity-60"
                            >
                              <td className="p-4 text-white font-medium flex items-center gap-3">
                                <Box className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500/50 to-red-600/50 flex items-center justify-center font-bold text-xs shadow-inner">
                                  {student.firstName[0]}{student.lastName[0]}
                                </Box>
                                {student.firstName} {student.lastName}
                              </td>
                              <td className="p-4 text-slate-300 font-mono">{student.enrollmentNo}</td>
                              <td className="p-4 text-slate-300 italic">--</td>
                              <td className="p-4">
                                <Chip 
                                  label="ABSENT" 
                                  size="small" 
                                  className="bg-red-500/20 text-red-300 border border-red-500/30 font-bold"
                                />
                              </td>
                            </motion.tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Box className="flex items-center justify-center h-48 bg-black/20 rounded-xl border border-white/5 mt-4">
                    <Typography className="text-slate-400 italic text-lg">
                      No students found in the database.
                    </Typography>
                  </Box>
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
