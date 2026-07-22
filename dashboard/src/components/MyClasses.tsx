import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Button, TextField, CircularProgress, Alert, IconButton, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Class as ClassIcon, Add, Delete, LibraryBooks } from '@mui/icons-material';
import axios from 'axios';

interface ClassData {
  id: string;
  name: string;
  courseCode: string;
  semester: string;
}

const DEFAULT_SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

export const MyClasses: React.FC = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('Semester 1');
  
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await axios.get('/api/v1/classes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode) return;
    
    setIsAdding(true);
    try {
      await axios.post('/api/v1/classes', {
        name: newName,
        courseCode: newCode,
        semester: selectedSemester
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setNewName('');
      setNewCode('');
      await fetchClasses();
    } catch (err) {
      console.error(err);
      setError('Failed to add class.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class? This will also delete all its attendance records.')) return;
    
    try {
      await axios.delete(`/api/v1/classes/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchClasses();
    } catch (err) {
      console.error(err);
      setError('Failed to delete class.');
    }
  };

  const displayedClasses = classes.filter(c => c.semester === selectedSemester);
  const uniqueSemesters = Array.from(new Set([...DEFAULT_SEMESTERS, ...classes.map(c => c.semester)])).sort();

  if (loading) {
    return (
      <Box className="flex h-screen items-center justify-center">
        <CircularProgress className="text-indigo-400" />
      </Box>
    );
  }

  return (
    <Box className="p-4 md:p-8 min-h-screen relative overflow-hidden">
      <Box className="absolute top-[5%] left-[40%] w-[35rem] h-[35rem] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      
      <Grid container spacing={4} className="relative z-10">
        <Grid item xs={12}>
          <Box className="glass-panel rounded-[2rem] p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Box>
              <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-200 tracking-tight flex items-center gap-4">
                <LibraryBooks fontSize="large" className="text-teal-400" />
                My Classes
              </Typography>
              <Typography variant="subtitle1" className="text-indigo-200 mt-2 font-medium">
                Manage your subjects and shift between semesters.
              </Typography>
            </Box>
            
            <FormControl variant="filled" sx={{ minWidth: 200, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <InputLabel className="text-white">Shift Semester</InputLabel>
              <Select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="text-white font-bold"
              >
                {uniqueSemesters.map(sem => (
                  <MenuItem key={sem} value={sem}>{sem}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        <Grid item xs={12} md={8}>
          <Box className="glass-panel rounded-[2rem] p-8 min-h-[400px]">
            <Typography variant="h5" className="font-bold text-white mb-6 border-b border-white/10 pb-4">
              Subjects for {selectedSemester}
            </Typography>
            
            <Grid container spacing={3}>
              {displayedClasses.length > 0 ? displayedClasses.map(cls => (
                <Grid item xs={12} md={6} key={cls.id}>
                  <Box className="bg-white/5 rounded-xl p-5 border border-white/10 flex justify-between items-start hover:bg-white/10 transition-colors">
                    <Box>
                      <Typography variant="h6" className="text-white font-bold flex items-center gap-2 mb-1">
                        <ClassIcon className="text-teal-400" fontSize="small" />
                        {cls.name}
                      </Typography>
                      <Typography className="text-teal-200 font-mono text-sm">
                        {cls.courseCode}
                      </Typography>
                    </Box>
                    <IconButton 
                      color="error" 
                      onClick={() => handleDeleteClass(cls.id)}
                      className="bg-red-500/10 hover:bg-red-500/20"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Grid>
              )) : (
                <Grid item xs={12}>
                  <Typography className="text-slate-400 italic text-center p-8 bg-black/20 rounded-xl border border-white/5">
                    No subjects added for this semester yet.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box className="glass-panel rounded-[2rem] p-8">
            <Typography variant="h5" className="font-bold text-white mb-6 border-b border-white/10 pb-4">
              Add New Subject
            </Typography>
            
            <Box component="form" onSubmit={handleAddClass} className="flex flex-col gap-6">
              <TextField 
                label="Subject Name" 
                variant="filled" 
                fullWidth 
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                InputProps={{ className: "text-white bg-white/5", sx: { borderRadius: 2 } }}
                InputLabelProps={{ className: "text-indigo-200" }}
                placeholder="e.g. Intro to AI"
              />
              <TextField 
                label="Course Code" 
                variant="filled" 
                fullWidth 
                required
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                InputProps={{ className: "text-white bg-white/5", sx: { borderRadius: 2 } }}
                InputLabelProps={{ className: "text-indigo-200" }}
                placeholder="e.g. CS-101"
              />

              <Button
                type="submit"
                variant="contained"
                disabled={isAdding || !newName || !newCode}
                startIcon={isAdding ? <CircularProgress size={20} /> : <Add />}
                className="py-4 font-bold rounded-xl mt-2 bg-gradient-to-r from-teal-400 to-indigo-500 hover:from-teal-500 hover:to-indigo-600 shadow-lg transition-transform transform hover:scale-[1.02]"
              >
                {isAdding ? 'Adding...' : `Add to ${selectedSemester}`}
              </Button>
            </Box>
          </Box>
        </Grid>

      </Grid>
    </Box>
  );
};
