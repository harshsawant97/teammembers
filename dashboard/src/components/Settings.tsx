import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Switch, Slider, Button, Divider, Alert, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, MenuItem, Select, FormControl, InputLabel 
} from '@mui/material';
import { 
  Settings as SettingsIcon, NotificationsActive, DarkMode, Save, Videocam, Security, People, Edit, Delete, Person, ManageAccounts, Psychology, School, Timer, PictureAsPdf, FileDownload, Key
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { LegendaryCard } from './LegendaryCard';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

// A styled Tab component to look professional and clean
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
      className="h-full"
    >
      {value === index && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  
  const [tabIndex, setTabIndex] = useState(0);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // State for all settings
  const [notifications, setNotifications] = useState(() => localStorage.getItem('setting_notifications') !== 'false');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('setting_darkMode') !== 'false');
  const [autoCamera, setAutoCamera] = useState(() => localStorage.getItem('setting_autoCamera') === 'true');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(() => {
    const val = localStorage.getItem('setting_confidenceThreshold');
    return val ? parseFloat(val) : 0.65;
  });
  const [exportFormat, setExportFormat] = useState(() => localStorage.getItem('setting_exportFormat') || 'csv');
  const [detectionInterval, setDetectionInterval] = useState<number>(() => parseInt(localStorage.getItem('setting_detectionInterval') || '500'));
  const [minFaceSize, setMinFaceSize] = useState<number>(() => parseInt(localStorage.getItem('setting_minFaceSize') || '100'));
  const [sessionTimeout, setSessionTimeout] = useState<number>(() => parseInt(localStorage.getItem('setting_sessionTimeout') || '60'));

  const [saved, setSaved] = useState(false);
  
  // Student Management State
  const [students, setStudents] = useState<any[]>([]);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  
  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    if (tabIndex === 3) {
      fetchStudents();
    }
  }, [tabIndex]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get('/api/v1/students', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  const handleSave = () => {
    localStorage.setItem('setting_notifications', String(notifications));
    localStorage.setItem('setting_darkMode', String(darkMode));
    localStorage.setItem('setting_autoCamera', String(autoCamera));
    localStorage.setItem('setting_confidenceThreshold', String(confidenceThreshold));
    localStorage.setItem('setting_exportFormat', exportFormat);
    localStorage.setItem('setting_detectionInterval', String(detectionInterval));
    localStorage.setItem('setting_minFaceSize', String(minFaceSize));
    localStorage.setItem('setting_sessionTimeout', String(sessionTimeout));
    
    window.dispatchEvent(new Event('theme-changed'));

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student and all their attendance/face data?')) return;
    try {
      await axios.delete(`/api/v1/students/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    try {
      await axios.put(`/api/v1/students/${editingStudent.id}`, editingStudent, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEditingStudent(null);
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const SettingRow = ({ icon: Icon, title, desc, control, colorHint = "indigo" }: any) => {
    const glowColor = colorHint === "indigo" ? "bg-indigo-500/10" : colorHint === "emerald" ? "bg-emerald-500/10" : "bg-teal-500/10";
    const hoverColor = colorHint === "indigo" ? "hover:border-indigo-500/30" : colorHint === "emerald" ? "hover:border-emerald-500/30" : "hover:border-teal-500/30";
    const iconColor = colorHint === "indigo" ? "text-indigo-400" : colorHint === "emerald" ? "text-emerald-400" : "text-teal-400";
    
    return (
      <motion.div variants={itemVariants} className={`flex justify-between items-center mb-4 p-5 bg-black/20 hover:bg-black/40 transition-colors rounded-2xl border border-white/5 ${hoverColor} relative overflow-hidden group`}>
        <Box className={`absolute top-0 right-0 w-24 h-24 ${glowColor} rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        <Box className="flex items-start gap-4 relative z-10">
          <Box className={`bg-white/5 p-3 rounded-xl border border-white/5`}>
            <Icon className={iconColor} />
          </Box>
          <Box className="mt-1">
            <Typography className="text-white font-bold text-lg">{title}</Typography>
            <Typography className="text-indigo-200/60 text-sm max-w-md mt-1 leading-relaxed">{desc}</Typography>
          </Box>
        </Box>
        <Box className="min-w-[120px] flex justify-end relative z-10">
          {control}
        </Box>
      </motion.div>
    );
  };

  return (
    <Box className="p-4 md:p-8 min-h-[calc(100vh-4rem)] relative overflow-hidden flex flex-col">
      <Box className="absolute bottom-[20%] right-[5%] w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      
      <Box className="relative z-10 flex flex-col h-full flex-grow">
        <Box className="flex justify-between items-center mb-8">
          <Box>
            <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300 tracking-tight flex items-center gap-4">
              <SettingsIcon fontSize="large" className="text-indigo-400" />
              Settings
            </Typography>
            <Typography variant="subtitle1" className="text-indigo-200/80 mt-2 font-medium">
              Manage your account, AI thresholds, and system preferences.
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            onClick={handleSave}
            startIcon={<Save />}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/30 font-bold py-3 px-8 rounded-xl transition-all hover:scale-105"
          >
            Save Changes
          </Button>
        </Box>

        {saved && (
          <Alert severity="success" className="mb-6 bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 rounded-xl shadow-lg shadow-emerald-500/10 backdrop-blur-md">
            All settings have been saved and applied globally!
          </Alert>
        )}

        <Grid container spacing={4} className="flex-grow">
          <Grid item xs={12} md={3} className="h-full">
            <LegendaryCard className="p-4 h-full sticky top-8">
              <Tabs
                orientation="vertical"
                value={tabIndex}
                onChange={handleTabChange}
                sx={{
                  borderRight: 0,
                  '& .MuiTab-root': {
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    minHeight: '60px',
                    borderRadius: '12px',
                    mb: 1,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    transition: 'all 0.3s ease',
                    '&.Mui-selected': {
                      color: '#fff',
                      background: 'linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0) 100%)',
                    },
                    '&:hover': {
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                    }
                  },
                  '& .MuiTabs-indicator': {
                    width: '4px',
                    borderRadius: '4px',
                    backgroundColor: '#818cf8'
                  }
                }}
              >
                <Tab icon={<ManageAccounts className="mr-3 mb-0" />} iconPosition="start" label="Account & Security" />
                <Tab icon={<SettingsIcon className="mr-3 mb-0" />} iconPosition="start" label="Preferences" />
                <Tab icon={<Psychology className="mr-3 mb-0" />} iconPosition="start" label="AI Vision Config" />
                <Tab icon={<School className="mr-3 mb-0" />} iconPosition="start" label="Student Directory" />
              </Tabs>
            </LegendaryCard>
          </Grid>

          <Grid item xs={12} md={9}>
            <LegendaryCard className="p-8 min-h-[600px]">
              
              <AnimatePresence mode="wait">
                {/* ACCOUNT & SECURITY */}
                <CustomTabPanel value={tabIndex} index={0}>
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col h-full">
                    <motion.div variants={itemVariants}>
                      <Typography variant="h5" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300 mb-6 flex items-center gap-3 tracking-tight">
                        <Security fontSize="large" className="text-emerald-400" /> Account Identity
                      </Typography>
                      <Divider className="bg-white/10 mb-8" />
                    </motion.div>
                
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <Box className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 rounded-2xl border border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/40 transition-colors shadow-lg">
                        <Box className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-emerald-500/30 transition-all" />
                        <Typography className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10"><Person fontSize="small"/> Identity Role</Typography>
                        <Typography className="text-white text-3xl font-black tracking-tight relative z-10">{user?.role || 'FACULTY'}</Typography>
                      </Box>
                      <Box className="bg-gradient-to-br from-teal-500/10 to-blue-500/10 p-6 rounded-2xl border border-teal-500/20 relative overflow-hidden group hover:border-teal-500/40 transition-colors shadow-lg">
                        <Box className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-teal-500/30 transition-all" />
                        <Typography className="text-teal-300 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10"><Security fontSize="small"/> Primary Email</Typography>
                        <Typography className="text-white text-xl font-bold truncate relative z-10">{user?.email || 'admin@smartattendance.com'}</Typography>
                      </Box>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <Typography variant="h6" className="font-bold text-white mb-4 mt-8">Security Configuration</Typography>
                    </motion.div>
                    
                    <SettingRow 
                      icon={Timer} 
                      title="Session Timeout (Minutes)" 
                      desc="Automatically log out if the dashboard is left idle for this duration." 
                      colorHint="emerald"
                      control={
                        <TextField 
                          type="number" 
                          variant="outlined" 
                          size="small"
                          value={sessionTimeout}
                          onChange={e => setSessionTimeout(parseInt(e.target.value) || 60)}
                          InputProps={{ className: "text-white bg-black/40 w-24 text-center rounded-lg border border-white/10 hover:border-emerald-500/50 transition-colors" }}
                        />
                      } 
                    />

                    <SettingRow 
                      icon={Key} 
                      title="Change Password" 
                      desc="Receive a secure link to your registered email to reset your account password." 
                      colorHint="emerald"
                      control={
                        <Button 
                          variant="outlined" 
                          onClick={() => setIsChangingPassword(true)}
                          className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 font-bold px-6 py-2 rounded-xl"
                        >
                          Update
                        </Button>
                      } 
                    />
                  </motion.div>
                </CustomTabPanel>

                {/* GENERAL PREFERENCES */}
                <CustomTabPanel value={tabIndex} index={1}>
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col h-full">
                    <motion.div variants={itemVariants}>
                      <Typography variant="h5" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 mb-6 flex items-center gap-3 tracking-tight">
                        <SettingsIcon fontSize="large" className="text-blue-400" /> UI & Dashboard Preferences
                      </Typography>
                      <Divider className="bg-white/10 mb-8" />
                    </motion.div>

                    <SettingRow 
                      icon={DarkMode} 
                      title="Enforce Dark Mode" 
                      desc="Lock the dashboard into dark theme. Reduces eye strain during evening lectures." 
                      colorHint="indigo"
                      control={<Switch checked={darkMode} onChange={e => setDarkMode(e.target.checked)} color="primary" />} 
                    />
                    
                    <SettingRow 
                      icon={NotificationsActive} 
                      title="Live Push Notifications" 
                      desc="Show a toast notification popup in the bottom corner every time a student's attendance is recorded." 
                      colorHint="indigo"
                      control={<Switch checked={notifications} onChange={e => setNotifications(e.target.checked)} color="primary" />} 
                    />
                    
                    <SettingRow 
                      icon={Videocam} 
                      title="Auto-Start Camera" 
                      desc="Instantly initialize the webcam stream as soon as you create a new session, skipping the manual start button." 
                      colorHint="indigo"
                      control={<Switch checked={autoCamera} onChange={e => setAutoCamera(e.target.checked)} color="primary" />} 
                    />

                    <SettingRow 
                      icon={FileDownload} 
                      title="Default Export Format" 
                      desc="Preferred file format when exporting attendance records from the dashboard." 
                      colorHint="indigo"
                      control={
                        <FormControl variant="filled" size="small" className="w-32">
                          <Select
                            value={exportFormat}
                            onChange={e => setExportFormat(e.target.value)}
                            className="text-white bg-black/40 rounded-xl border border-white/10 hover:border-indigo-500/50 transition-colors"
                            disableUnderline
                            sx={{ color: 'white', '.MuiSelect-icon': { color: 'white' } }}
                          >
                            <MenuItem value="csv">.CSV (Excel)</MenuItem>
                            <MenuItem value="pdf">.PDF</MenuItem>
                          </Select>
                        </FormControl>
                      } 
                    />
                  </motion.div>
                </CustomTabPanel>

                {/* AI VISION CONFIG */}
                <CustomTabPanel value={tabIndex} index={2}>
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col h-full">
                    <motion.div variants={itemVariants}>
                      <Typography variant="h5" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 mb-6 flex items-center gap-3 tracking-tight">
                        <Psychology fontSize="large" className="text-purple-400" /> Engine & AI Thresholds
                      </Typography>
                      <Divider className="bg-white/10 mb-8" />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <Box className="p-8 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[2rem] border border-purple-500/20 mb-8 relative overflow-hidden shadow-[0_8px_32px_0_rgba(168,85,247,0.15)] group hover:border-purple-500/40 transition-colors">
                        <Box className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors" />
                        <Typography className="text-white font-bold text-xl mb-2 relative z-10">Facial Match Strictness</Typography>
                        <Typography className="text-indigo-200/80 text-sm mb-8 max-w-2xl relative z-10">
                          Adjust the mathematical distance threshold used to match faces. A higher percentage demands a more exact physical match to the registered embedding, reducing false positives but potentially ignoring a student if lighting is poor.
                        </Typography>
                        
                        <Box className="px-6 pb-2 relative z-10">
                          <Slider 
                            value={confidenceThreshold} 
                            min={0.4} 
                            max={0.75} 
                            step={0.05} 
                            onChange={(_, val) => setConfidenceThreshold(val as number)} 
                            sx={{ 
                              color: '#a855f7',
                              height: 10,
                              '& .MuiSlider-thumb': { width: 28, height: 28, backgroundColor: '#fff', border: '5px solid #a855f7', boxShadow: '0 0 10px rgba(168,85,247,0.5)' },
                              '& .MuiSlider-markLabel': { color: '#94a3b8', fontSize: '0.8rem', mt: 2, fontWeight: 'bold' }
                            }}
                            marks={[
                              { value: 0.4, label: 'Lenient (40%)' },
                              { value: 0.60, label: 'Optimal (60%)' },
                              { value: 0.75, label: 'Strict (75%)' },
                            ]}
                          />
                        </Box>
                      </Box>
                    </motion.div>

                    <SettingRow 
                      icon={Timer} 
                      title="Detection Polling Interval (ms)" 
                      desc="How frequently the AI processes the video frame. Lower values mean faster detection but cause high CPU usage." 
                      colorHint="indigo"
                      control={
                        <TextField 
                          type="number" 
                          variant="outlined" 
                          size="small"
                          value={detectionInterval}
                          onChange={e => setDetectionInterval(parseInt(e.target.value) || 500)}
                          InputProps={{ className: "text-white bg-black/40 w-24 text-center rounded-lg border border-white/10 hover:border-purple-500/50 transition-colors" }}
                        />
                      } 
                    />

                    <SettingRow 
                      icon={Person} 
                      title="Minimum Face Box Size (px)" 
                      desc="Ignore faces smaller than this size to prevent falsely matching tiny faces walking far away in the background." 
                      colorHint="indigo"
                      control={
                        <TextField 
                          type="number" 
                          variant="outlined" 
                          size="small"
                          value={minFaceSize}
                          onChange={e => setMinFaceSize(parseInt(e.target.value) || 100)}
                          InputProps={{ className: "text-white bg-black/40 w-24 text-center rounded-lg border border-white/10 hover:border-purple-500/50 transition-colors" }}
                        />
                      } 
                    />
                  </motion.div>
                </CustomTabPanel>

                {/* STUDENT DIRECTORY */}
                <CustomTabPanel value={tabIndex} index={3}>
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col h-full">
                    <motion.div variants={itemVariants}>
                      <Typography variant="h5" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400 mb-6 flex items-center gap-3 tracking-tight">
                        <School fontSize="large" className="text-rose-400" /> Student Directory
                      </Typography>
                      <Divider className="bg-white/10 mb-6" />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <Box className="overflow-hidden rounded-3xl border border-white/10 bg-black/20 shadow-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                              <th className="p-5 font-bold uppercase tracking-wider text-xs text-indigo-300">Enrollment No</th>
                              <th className="p-5 font-bold uppercase tracking-wider text-xs text-indigo-300">Name</th>
                              <th className="p-5 font-bold uppercase tracking-wider text-xs text-indigo-300">Department</th>
                              <th className="p-5 font-bold uppercase tracking-wider text-xs text-indigo-300 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(student => (
                              <tr key={student.id} className="border-b border-white/5 hover:bg-white/10 transition-colors group">
                                <td className="p-5 text-white font-mono text-sm">{student.enrollmentNo}</td>
                                <td className="p-5 text-white font-bold">{student.firstName} {student.lastName}</td>
                                <td className="p-5 text-indigo-200/80 text-sm font-medium">{student.department?.name}</td>
                                <td className="p-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                  <IconButton size="small" className="text-blue-400 hover:bg-blue-400/20 mr-2 border border-blue-400/20" onClick={() => setEditingStudent(student)}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" className="text-rose-400 hover:bg-rose-400/20 border border-rose-400/20" onClick={() => handleDeleteStudent(student.id)}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </td>
                              </tr>
                            ))}
                            {students.length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-12 text-center text-indigo-200/50">
                                  <School sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                                  <Typography className="italic">No students registered yet.</Typography>
                                  <Typography variant="body2" className="mt-1 opacity-70">Register them via the "Register Student" tab.</Typography>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </Box>
                    </motion.div>
                  </motion.div>
                </CustomTabPanel>
              </AnimatePresence>

            </LegendaryCard>
          </Grid>
        </Grid>
      </Box>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onClose={() => setEditingStudent(null)} PaperProps={{ className: "bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl min-w-[400px]" }}>
        <DialogTitle className="font-bold text-white border-b border-white/10 flex items-center gap-2 p-6">
          <Edit className="text-indigo-400"/> Edit Student Details
        </DialogTitle>
        <DialogContent className="p-6">
          <Box className="flex flex-col gap-5 mt-2">
            <TextField 
              label="First Name" 
              variant="filled" 
              value={editingStudent?.firstName || ''} 
              onChange={e => setEditingStudent({...editingStudent, firstName: e.target.value})}
              InputProps={{ className: "text-white bg-white/5 hover:bg-white/10 rounded-xl", disableUnderline: true }}
              InputLabelProps={{ className: "text-indigo-300" }}
            />
            <TextField 
              label="Last Name" 
              variant="filled" 
              value={editingStudent?.lastName || ''} 
              onChange={e => setEditingStudent({...editingStudent, lastName: e.target.value})}
              InputProps={{ className: "text-white bg-white/5 hover:bg-white/10 rounded-xl", disableUnderline: true }}
              InputLabelProps={{ className: "text-indigo-300" }}
            />
            <TextField 
              label="Enrollment No" 
              variant="filled" 
              value={editingStudent?.enrollmentNo || ''} 
              onChange={e => setEditingStudent({...editingStudent, enrollmentNo: e.target.value})}
              InputProps={{ className: "text-white bg-white/5 hover:bg-white/10 rounded-xl", disableUnderline: true }}
              InputLabelProps={{ className: "text-indigo-300" }}
            />
            <TextField 
              label="Student Email Address" 
              variant="filled" 
              type="email"
              value={editingStudent?.email || ''} 
              onChange={e => setEditingStudent({...editingStudent, email: e.target.value})}
              InputProps={{ className: "text-white bg-white/5 hover:bg-white/10 rounded-xl", disableUnderline: true }}
              InputLabelProps={{ className: "text-indigo-300" }}
            />
          </Box>
        </DialogContent>
        <DialogActions className="p-6 border-t border-white/10 bg-black/20">
          <Button onClick={() => setEditingStudent(null)} className="text-indigo-300 hover:bg-white/5 rounded-lg px-4">Cancel</Button>
          <Button onClick={handleUpdateStudent} variant="contained" className="bg-indigo-500 hover:bg-indigo-600 font-bold rounded-lg px-6 shadow-lg shadow-indigo-500/20">Save Changes</Button>
        </DialogActions>
      </Dialog>
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
    </Box>
  );
};
