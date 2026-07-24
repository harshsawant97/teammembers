import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Grid, Chip, TextField, Button, MenuItem } from '@mui/material';
import { QuestionAnswer, CheckCircle, Reply } from '@mui/icons-material';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from './PageWrapper';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

interface Query {
  id: string;
  studentId: string;
  studentEmail: string;
  subject: string;
  semester?: string;
  course?: string;
  message: string;
  status: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export const Queries: React.FC = () => {
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [remarkInput, setRemarkInput] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  const fetchQueries = async () => {
    try {
      const res = await axios.get('/api/v1/queries', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setQueries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const handleAddRemark = async () => {
    if (!selectedQuery || !remarkInput.trim()) return;
    try {
      await axios.patch(`/api/v1/queries/${selectedQuery.id}/remark`, { remark: remarkInput }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRemarkInput('');
      setSelectedQuery(null);
      fetchQueries();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Box className="flex h-screen items-center justify-center">
        <CircularProgress className="text-indigo-400" />
      </Box>
    );
  }

  return (
    <PageWrapper className="p-4 md:p-8 min-h-screen">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto">
        <motion.div variants={itemVariants} className="mb-8">
          <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 flex items-center gap-4">
            <QuestionAnswer fontSize="large" className="text-indigo-400" />
            Student Queries
          </Typography>
          <Typography className="text-indigo-200 mt-2 font-medium">
            Manage and respond to student inquiries and reports.
          </Typography>
        </motion.div>

        {/* Metric Blocks */}
        <motion.div variants={itemVariants} className="mb-8">
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box 
                onClick={() => setFilter('ALL')}
                className={`glass-panel rounded-2xl p-6 border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-center items-center text-center ${filter === 'ALL' ? 'bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/10'}`}
              >
                <Typography className="text-slate-400 font-bold mb-1">Total Queries</Typography>
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

        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] p-6 border border-white/10 bg-white/5 backdrop-blur-md">
              <Box className="flex justify-between items-center mb-6">
                <Typography variant="h6" className="text-white font-bold">Recent Queries</Typography>
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
                      '&.Mui-focused fieldset': { borderColor: '#818cf8' },
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
                      onClick={() => setSelectedQuery(q)}
                      className={`p-6 rounded-xl border transition-all cursor-pointer ${selectedQuery?.id === q.id ? 'bg-indigo-500/20 border-indigo-400' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                    >
                      <Box className="flex justify-between items-start mb-2">
                        <Typography className="text-white font-bold">{q.subject}</Typography>
                        <Chip 
                          label={q.status} 
                          size="small" 
                          className={`font-bold ${q.status === 'OPEN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'}`}
                        />
                      </Box>
                      {(q.semester || q.course) && (
                        <Box className="flex gap-2 mb-2">
                          {q.semester && <Chip size="small" label={q.semester} className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] h-5" />}
                          {q.course && <Chip size="small" label={q.course} className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] h-5" />}
                        </Box>
                      )}
                      <Typography className="text-indigo-200/70 text-sm mb-3">From: {q.studentEmail}</Typography>
                      <Typography className="text-slate-300 text-sm line-clamp-2">{q.message}</Typography>
                      <Typography className="text-slate-500 text-xs mt-4">
                        {new Date(q.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={5}>
            <AnimatePresence mode="wait">
              {selectedQuery ? (
                <motion.div 
                  key="selected"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-panel rounded-[2rem] p-6 border border-indigo-500/30 bg-indigo-900/10 backdrop-blur-md sticky top-24"
                >
                  <Typography variant="h6" className="text-white font-bold mb-4 flex items-center gap-2">
                    <Reply className="text-indigo-400" /> Respond to Query
                  </Typography>
                  
                  <Box className="bg-black/30 p-4 rounded-xl mb-6 border border-white/5">
                    <Typography className="text-indigo-200 font-bold mb-1">Subject: {selectedQuery.subject}</Typography>
                    {(selectedQuery.semester || selectedQuery.course) && (
                      <Typography className="text-teal-300 text-xs mb-3 font-semibold">
                        {selectedQuery.course} • {selectedQuery.semester}
                      </Typography>
                    )}
                    <Typography className="text-slate-300 text-sm mb-4 leading-relaxed">{selectedQuery.message}</Typography>
                    <Box className="flex justify-between items-center border-t border-white/10 pt-3">
                      <Typography className="text-slate-500 text-xs font-mono">{selectedQuery.studentEmail}</Typography>
                      <Typography className="text-slate-500 text-xs">{new Date(selectedQuery.createdAt).toLocaleDateString()}</Typography>
                    </Box>
                  </Box>

                  {selectedQuery.status === 'RESOLVED' ? (
                    <Box className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                      <Typography className="text-green-400 font-bold flex items-center gap-2 mb-2">
                        <CheckCircle fontSize="small" /> Resolved
                      </Typography>
                      <Typography className="text-green-100 text-sm">
                        Your remark: {selectedQuery.remark}
                      </Typography>
                    </Box>
                  ) : (
                    <Box className="flex flex-col gap-4">
                      <TextField
                        multiline
                        rows={4}
                        variant="outlined"
                        placeholder="Type your remark/resolution here..."
                        value={remarkInput}
                        onChange={(e) => setRemarkInput(e.target.value)}
                        className="bg-black/20 rounded-xl"
                        InputProps={{ className: 'text-white' }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                          }
                        }}
                      />
                      <Button 
                        variant="contained" 
                        onClick={handleAddRemark}
                        disabled={!remarkInput.trim()}
                        className="bg-indigo-500 hover:bg-indigo-600 font-bold py-3 rounded-xl disabled:opacity-50 disabled:bg-indigo-500"
                      >
                        Submit Remark & Resolve
                      </Button>
                    </Box>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel rounded-[2rem] p-8 border border-white/5 bg-black/20 flex flex-col items-center justify-center text-center min-h-[300px]"
                >
                  <QuestionAnswer className="text-slate-600 text-6xl mb-4" />
                  <Typography className="text-slate-400 font-medium">
                    Select a query from the list to view details and respond.
                  </Typography>
                </motion.div>
              )}
            </AnimatePresence>
          </Grid>
        </Grid>
      </motion.div>
    </PageWrapper>
  );
};
