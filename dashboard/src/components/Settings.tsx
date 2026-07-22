import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Switch, Slider, Button, Divider, Alert, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, MenuItem, Select, FormControl, InputLabel 
} from '@mui/material';
import { 
  Settings as SettingsIcon, NotificationsActive, DarkMode, Save, Videocam, Security, People, Edit, Delete, Person, ManageAccounts, Psychology, School, Timer, PictureAsPdf, FileDownload
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

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
        <Box className="h-full animate-fadeIn">
          {children}
        </Box>
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

  const SettingRow = ({ icon: Icon, title, desc, control }: any) => (
    <Box className="flex justify-between items-center mb-4 p-5 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/5 hover:border-white/20">
      <Box className="flex items-start gap-4">
        <Box className="bg-indigo-500/20 p-2 rounded-lg mt-1">
          <Icon className="text-indigo-400" />
        </Box>
        <Box>
          <Typography className="text-white font-bold text-lg">{title}</Typography>
          <Typography className="text-indigo-200/70 text-sm max-w-md mt-1 leading-relaxed">{desc}</Typography>
        </Box>
      </Box>
      <Box className="min-w-[120px] flex justify-end">
        {control}
      </Box>
    </Box>
  );

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
            <Box className="glass-panel rounded-3xl p-4 h-full sticky top-8 border border-white/10 shadow-2xl shadow-black/50">
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
            </Box>
          </Grid>

          <Grid item xs={12} md={9}>
            <Box className="glass-panel rounded-3xl p-8 min-h-[600px] border border-white/10 shadow-2xl shadow-black/50">
              
              {/* ACCOUNT & SECURITY */}
              <CustomTabPanel value={tabIndex} index={0}>
                <Typography variant="h5" className="font-bold text-white mb-6 flex items-center gap-3">
                  <Security className="text-emerald-400" /> Account Details
                </Typography>
                <Divider className="bg-white/10 mb-8" />
                
                <Box className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Box className="bg-white/5 p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                    <Box className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-all" />
                    <Typography className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Person fontSize="small"/> Identity Role</Typography>
                    <Typography className="text-white text-2xl font-light">{user?.role || 'FACULTY'}</Typography>
                  </Box>
                  <Box className="bg-white/5 p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                    <Box className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-all" />
                    <Typography className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Security fontSize="small"/> Primary Email</Typography>
                    <Typography className="text-white text-xl font-light truncate">{user?.email || 'admin@smartattendance.com'}</Typography>
                  </Box>
                </Box>

                <Typography variant="h6" className="font-bold text-white mb-4 mt-12">Security Settings</Typography>
                
                <SettingRow 
                  icon={Timer} 
                  title="Session Timeout (Minutes)" 
                  desc="Automatically log out if the dashboard is left idle for this duration." 
                  control={
                    <TextField 
                      type="number" 
                      variant="outlined" 
                      size="small"
                      value={sessionTimeout}
                      onChange={e => setSessionTimeout(parseInt(e.target.value) || 60)}
                      InputProps={{ className: "text-white bg-black/20 w-24 text-center rounded-lg" }}
                    />
                  } 
                />
              </CustomTabPanel>

              {/* GENERAL PREFERENCES */}
              <CustomTabPanel value={tabIndex} index={1}>
                <Typography variant="h5" className="font-bold text-white mb-6 flex items-center gap-3">
                  <SettingsIcon className="text-blue-400" /> General Preferences
                </Typography>
                <Divider className="bg-white/10 mb-8" />

                <SettingRow 
                  icon={DarkMode} 
                  title="Enforce Dark Mode" 
                  desc="Lock the dashboard into dark theme. Reduces eye strain during evening lectures." 
                  control={<Switch checked={darkMode} onChange={e => setDarkMode(e.target.checked)} color="primary" />} 
                />
                
                <SettingRow 
                  icon={NotificationsActive} 
                  title="Live Push Notifications" 
                  desc="Show a toast notification popup in the bottom corner every time a student's attendance is recorded." 
                  control={<Switch checked={notifications} onChange={e => setNotifications(e.target.checked)} color="primary" />} 
                />
                
                <SettingRow 
                  icon={Videocam} 
                  title="Auto-Start Camera" 
                  desc="Instantly initialize the webcam stream as soon as you create a new session, skipping the manual start button." 
                  control={<Switch checked={autoCamera} onChange={e => setAutoCamera(e.target.checked)} color="primary" />} 
                />

                <SettingRow 
                  icon={FileDownload} 
                  title="Default Export Format" 
                  desc="Preferred file format when exporting attendance records from the dashboard." 
                  control={
                    <FormControl variant="filled" size="small" className="w-32">
                      <Select
                        value={exportFormat}
                        onChange={e => setExportFormat(e.target.value)}
                        className="text-white bg-black/20 rounded-lg"
                        sx={{ color: 'white', '.MuiSelect-icon': { color: 'white' } }}
                      >
                        <MenuItem value="csv">.CSV (Excel)</MenuItem>
                        <MenuItem value="pdf">.PDF</MenuItem>
                      </Select>
                    </FormControl>
                  } 
                />
              </CustomTabPanel>

              {/* AI VISION CONFIG */}
              <CustomTabPanel value={tabIndex} index={2}>
                <Typography variant="h5" className="font-bold text-white mb-6 flex items-center gap-3">
                  <Psychology className="text-purple-400" /> AI Vision Configuration
                </Typography>
                <Divider className="bg-white/10 mb-8" />

                <Box className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl border border-purple-500/20 mb-8 relative overflow-hidden">
                  <Box className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
                  <Typography className="text-white font-bold text-lg mb-2 relative z-10">Facial Match Strictness</Typography>
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
                        height: 8,
                        '& .MuiSlider-thumb': { width: 24, height: 24, backgroundColor: '#fff', border: '4px solid #a855f7' },
                        '& .MuiSlider-markLabel': { color: '#94a3b8', fontSize: '0.8rem', mt: 1 }
                      }}
                      marks={[
                        { value: 0.4, label: 'Lenient (40%)' },
                        { value: 0.60, label: 'Optimal (60%)' },
                        { value: 0.75, label: 'Strict (75%)' },
                      ]}
                    />
                  </Box>
                </Box>

                <SettingRow 
                  icon={Timer} 
                  title="Detection Polling Interval (ms)" 
                  desc="How frequently the AI processes the video frame. Lower values mean faster detection but cause high CPU usage." 
                  control={
                    <TextField 
                      type="number" 
                      variant="outlined" 
                      size="small"
                      value={detectionInterval}
                      onChange={e => setDetectionInterval(parseInt(e.target.value) || 500)}
                      InputProps={{ className: "text-white bg-black/20 w-24 text-center rounded-lg" }}
                    />
                  } 
                />

                <SettingRow 
                  icon={Person} 
                  title="Minimum Face Box Size (px)" 
                  desc="Ignore faces smaller than this size to prevent falsely matching tiny faces walking far away in the background." 
                  control={
                    <TextField 
                      type="number" 
                      variant="outlined" 
                      size="small"
                      value={minFaceSize}
                      onChange={e => setMinFaceSize(parseInt(e.target.value) || 100)}
                      InputProps={{ className: "text-white bg-black/20 w-24 text-center rounded-lg" }}
                    />
                  } 
                />
              </CustomTabPanel>

              {/* STUDENT DIRECTORY */}
              <CustomTabPanel value={tabIndex} index={3}>
                <Typography variant="h5" className="font-bold text-white mb-6 flex items-center gap-3">
                  <School className="text-rose-400" /> Student Directory
                </Typography>
                <Divider className="bg-white/10 mb-6" />

                <Box className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="p-4 font-semibold uppercase tracking-wider text-xs text-indigo-300">Enrollment No</th>
                        <th className="p-4 font-semibold uppercase tracking-wider text-xs text-indigo-300">Name</th>
                        <th className="p-4 font-semibold uppercase tracking-wider text-xs text-indigo-300">Department</th>
                        <th className="p-4 font-semibold uppercase tracking-wider text-xs text-indigo-300 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="p-4 text-white font-mono text-sm">{student.enrollmentNo}</td>
                          <td className="p-4 text-white font-bold">{student.firstName} {student.lastName}</td>
                          <td className="p-4 text-indigo-200/80 text-sm">{student.department?.name}</td>
                          <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            <IconButton size="small" className="text-blue-400 hover:bg-blue-400/20 mr-2" onClick={() => setEditingStudent(student)}>
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" className="text-rose-400 hover:bg-rose-400/20" onClick={() => handleDeleteStudent(student.id)}>
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
              </CustomTabPanel>

            </Box>
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
    </Box>
  );
};
