import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Grid, Chip, TextField, Button, MenuItem } from '@mui/material';
import { QuestionAnswer, AddCircle, CheckCircle } from '@mui/icons-material';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

interface ClassData {
  id: string;
  name: string;
  courseCode: string;
  semester: string;
}

interface Query {
  id: string;
  subject: string;
  semester?: string;
  course?: string;
  message: string;
  status: string;
  remark: string;
  createdAt: string;
}

export const StudentQueries: React.FC = () => {
  const [queries, setQueries] = useState<Query[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [course, setCourse] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [queriesRes, classesRes] = await Promise.all([
        axios.get('/api/v1/queries', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        axios.get('/api/v1/classes', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      setQueries(queriesRes.data);
      setAvailableClasses(classesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueSemesters = Array.from(new Set(availableClasses.map(c => c.semester))).sort();
  const filteredClasses = availableClasses.filter(c => c.semester === semester);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !semester.trim() || !course.trim()) return;
    setSubmitting(true);
    try {
      await axios.post('/api/v1/queries', { subject, message, semester, course }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSubject('');
      setSemester('');
      setCourse('');
      setMessage('');
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
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
      <Box className="absolute top-[10%] left-[20%] w-[30rem] h-[30rem] bg-teal-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 max-w-5xl mx-auto">
        <motion.div variants={itemVariants} className="mb-8 flex justify-between items-end">
          <Box>
            <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-300 flex items-center gap-4 tracking-tight">
              <QuestionAnswer fontSize="large" className="text-teal-400" />
              My Queries
            </Typography>
            <Typography className="text-teal-100/70 mt-2 font-medium">
              Submit reports, issues, or general questions to the faculty.
            </Typography>
          </Box>
          <Button 
            variant="contained"
            onClick={() => setShowForm(!showForm)}
            className={`font-bold py-2 px-6 rounded-xl shadow-lg transition-all ${showForm ? 'bg-slate-700 hover:bg-slate-600' : 'bg-teal-500 hover:bg-teal-600'}`}
            startIcon={showForm ? undefined : <AddCircle />}
          >
            {showForm ? 'Cancel' : 'New Query'}
          </Button>
        </motion.div>

        {/* Metric Blocks */}
        <motion.div variants={itemVariants} className="mb-8">
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box 
                onClick={() => setFilter('ALL')}
                className={`glass-panel rounded-2xl p-6 border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-center items-center text-center ${filter === 'ALL' ? 'bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/10'}`}
              >
                <Typography className="text-slate-400 font-bold mb-1">Total Submitted</Typography>
                <Typography variant="h3" className="text-white font-extrabold">{queries.length}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box 
                onClick={() => setFilter('OPEN')}
                className={`glass-panel rounded-2xl p-6 border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-center items-center text-center ${filter === 'OPEN' ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.15)]' : 'bg-amber-500/10 border-amber-500/30'}`}
              >
                <Typography className="text-amber-300 font-bold mb-1">Pending Queries</Typography>
                <Typography variant="h3" className="text-amber-400 font-extrabold">
                  {queries.filter(q => q.status === 'OPEN').length}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box 
                onClick={() => setFilter('RESOLVED')}
                className={`glass-panel rounded-2xl p-6 border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-center items-center text-center ${filter === 'RESOLVED' ? 'bg-green-500/20 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.15)]' : 'bg-green-500/10 border-green-500/30'}`}
              >
                <Typography className="text-green-300 font-bold mb-1">Resolved Queries</Typography>
                <Typography variant="h3" className="text-green-400 font-extrabold">
                  {queries.filter(q => q.status === 'RESOLVED').length}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <Box className="glass-panel rounded-[2rem] p-6 border border-teal-500/30 bg-teal-900/10 backdrop-blur-md">
                <Typography variant="h6" className="text-white font-bold mb-4">Submit a New Query</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      label="Semester"
                      variant="outlined"
                      value={semester}
                      onChange={(e) => {
                        setSemester(e.target.value);
                        setCourse(''); // Reset course when semester changes
                      }}
                      className="bg-black/20 rounded-xl"
                      InputLabelProps={{ className: 'text-teal-200' }}
                      InputProps={{ className: 'text-white' }}
                      SelectProps={{
                        MenuProps: { PaperProps: { className: "bg-slate-800 text-white" } }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: 'rgba(45,212,191,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(45,212,191,0.4)' },
                          '&.Mui-focused fieldset': { borderColor: '#2dd4bf' },
                        }
                      }}
                    >
                      {uniqueSemesters.length > 0 ? (
                        uniqueSemesters.map(sem => (
                          <MenuItem key={sem} value={sem}>{sem}</MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">No classes available</MenuItem>
                      )}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      label="Course/Subject"
                      variant="outlined"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="bg-black/20 rounded-xl"
                      InputLabelProps={{ className: 'text-teal-200' }}
                      InputProps={{ className: 'text-white' }}
                      SelectProps={{
                        MenuProps: { PaperProps: { className: "bg-slate-800 text-white max-h-60" } }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: 'rgba(45,212,191,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(45,212,191,0.4)' },
                          '&.Mui-focused fieldset': { borderColor: '#2dd4bf' },
                        }
                      }}
                    >
                      {(semester && filteredClasses.length > 0) ? (
                        filteredClasses.map(cls => (
                          <MenuItem key={cls.id} value={cls.name}>{cls.name}</MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">Select a Semester first (or no subjects available)</MenuItem>
                      )}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Query Title"
                      variant="outlined"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="bg-black/20 rounded-xl"
                      InputLabelProps={{ className: 'text-teal-200' }}
                      InputProps={{ className: 'text-white' }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: 'rgba(45,212,191,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(45,212,191,0.4)' },
                          '&.Mui-focused fieldset': { borderColor: '#2dd4bf' },
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Message Details"
                      variant="outlined"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="bg-black/20 rounded-xl"
                      InputLabelProps={{ className: 'text-teal-200' }}
                      InputProps={{ className: 'text-white' }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: 'rgba(45,212,191,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(45,212,191,0.4)' },
                          '&.Mui-focused fieldset': { borderColor: '#2dd4bf' },
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} className="flex justify-end">
                    <Button 
                      variant="contained" 
                      onClick={handleSubmit}
                      disabled={!subject.trim() || !message.trim() || !semester.trim() || !course.trim() || submitting}
                      className="bg-teal-500 hover:bg-teal-600 font-bold py-3 px-8 rounded-xl disabled:opacity-50 disabled:bg-teal-500"
                    >
                      {submitting ? 'Submitting...' : 'Submit Query'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] p-8 border border-white/10 bg-white/5 backdrop-blur-md">
          <Box className="flex justify-between items-center mb-6">
            <Typography variant="h6" className="text-white font-bold">Query History</Typography>
            <TextField
              select
              size="small"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-black/40 rounded-lg min-w-[150px]"
              InputProps={{ className: 'text-white text-sm' }}
              SelectProps={{
                MenuProps: { PaperProps: { className: "bg-slate-800 text-white" } }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#2dd4bf' },
                }
              }}
            >
              <MenuItem value="ALL">All Queries</MenuItem>
              <MenuItem value="OPEN">Pending</MenuItem>
              <MenuItem value="RESOLVED">Resolved</MenuItem>
            </TextField>
          </Box>
          <Box className="flex flex-col gap-4">
            {queries.filter(q => filter === 'ALL' || q.status === filter).length === 0 ? (
              <Typography className="text-slate-400 italic text-center p-8">No queries match this filter.</Typography>
            ) : (
              queries.filter(q => filter === 'ALL' || q.status === filter).map(q => (
                <Box 
                  key={q.id}
                  className="p-6 rounded-xl border border-white/5 bg-black/20 hover:bg-black/30 transition-colors"
                >
                  <Box className="flex justify-between items-start mb-2">
                    <Typography className="text-white font-bold text-lg">{q.subject}</Typography>
                    <Chip 
                      label={q.status} 
                      size="small" 
                      className={`font-bold ${q.status === 'OPEN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'}`}
                    />
                  </Box>
                  {(q.semester || q.course) && (
                    <Box className="flex gap-2 mb-3">
                      {q.semester && <Chip size="small" label={q.semester} className="bg-teal-500/20 text-teal-300 border border-teal-500/30" />}
                      {q.course && <Chip size="small" label={q.course} className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" />}
                    </Box>
                  )}
                  <Typography className="text-slate-300 text-sm mb-4">{q.message}</Typography>
                  <Typography className="text-slate-500 text-xs mb-4">
                    Submitted on: {new Date(q.createdAt).toLocaleString()}
                  </Typography>

                  {q.status === 'RESOLVED' && (
                    <Box className="mt-4 p-4 rounded-xl bg-teal-900/20 border border-teal-500/20 relative overflow-hidden">
                      <Box className="absolute top-0 left-0 w-1 h-full bg-teal-500" />
                      <Typography className="text-teal-300 font-bold flex items-center gap-2 mb-1 text-sm">
                        <CheckCircle fontSize="small" /> Faculty Remark
                      </Typography>
                      <Typography className="text-teal-100 text-sm pl-6">
                        {q.remark}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))
            )}
          </Box>
        </motion.div>

      </motion.div>
    </Box>
  );
};
