import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Grid, TextField, Button, CircularProgress, Alert, MenuItem } from '@mui/material';
import { CameraAlt, PersonAdd, Save, People as PeopleIcon } from '@mui/icons-material';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const rowVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
  show: (i: number) => ({
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)', 
    transition: { delay: i * 0.05, type: 'spring' as const, stiffness: 300, damping: 24 }
  })
};

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNo: string;
  email: string;
  phoneNo: string;
  department: { name: string };
  gender?: string;
}

export const StudentRegistration: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [gender, setGender] = useState('');
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [studentsList, setStudentsList] = useState<Student[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
        startWebcam();
      } catch (err) {
        console.error("Failed to load AI models", err);
        setError("Failed to load AI models.");
      }
    };
    loadModels();
    fetchStudents();

    return () => {
      stopWebcam();
    };
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get('/api/v1/students', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudentsList(res.data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  const startWebcam = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setIsCameraReady(true);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Failed to access camera.");
    }
  };

  const stopWebcam = () => {
    if (trackingInterval.current) clearInterval(trackingInterval.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    // Draw box for feedback
    trackingInterval.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (detection) {
        const resized = faceapi.resizeResults(detection, displaySize);
        faceapi.draw.drawDetections(canvasRef.current, resized);
      }
    }, 200);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !phoneNo) {
      setError("Please fill out all required fields (First Name, Last Name, Email, Phone No).");
      return;
    }

    if (!videoRef.current) {
      setError("Camera not ready.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Capture High-Res descriptor
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError("No face detected! Please look directly at the camera.");
        setLoading(false);
        return;
      }

      // Convert Float32Array to standard array
      const descriptorArray = Array.from(detection.descriptor);

      await axios.post('/api/v1/students', {
        firstName,
        lastName,
        enrollmentNo,
        email,
        phoneNo,
        departmentName,
        gender,
        descriptor: descriptorArray
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess(true);
      setFirstName('');
      setLastName('');
      setEnrollmentNo('');
      setEmail('');
      setPhoneNo('');
      setDepartmentName('');
      setGender('');
      fetchStudents(); // Refresh the list after registration
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to register student.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="p-4 md:p-8 min-h-screen relative overflow-hidden">
      <Box className="absolute top-[10%] left-[-5%] w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      
      <Grid container spacing={4} className="relative z-10">
        <Grid item xs={12}>
          <Box className="glass-panel rounded-[2rem] p-8">
            <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-200 tracking-tight flex items-center gap-4">
              <PersonAdd fontSize="large" className="text-teal-400" />
              Student Registration
            </Typography>
            <Typography variant="subtitle1" className="text-indigo-200 mt-2 font-medium">
              Enroll new students and capture their facial signatures securely.
            </Typography>
          </Box>
        </Grid>

        {/* Form Panel */}
        <Grid item xs={12} md={5}>
          <Box className="glass-panel rounded-[2rem] p-8 h-full">
            <Typography variant="h5" className="font-bold text-white mb-6 border-b border-white/10 pb-4">
              Student Details
            </Typography>

            {error && <Alert severity="error" className="mb-4">{error}</Alert>}
            {success && <Alert severity="success" className="mb-4">Student registered successfully!</Alert>}

            <Box component="form" onSubmit={handleRegister} className="flex flex-col gap-6">
              <TextField 
                label="First Name *" 
                variant="filled" 
                fullWidth 
                required
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                InputProps={{ className: "text-white bg-white/5", sx: { borderRadius: 2 } }}
                InputLabelProps={{ className: "text-indigo-200" }}
              />
              <TextField 
                label="Last Name *" 
                variant="filled" 
                fullWidth 
                required
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                InputProps={{ className: "text-white bg-white/5", sx: { borderRadius: 2 } }}
                InputLabelProps={{ className: "text-indigo-200" }}
              />
              <TextField 
                label="Student Email Address *" 
                variant="filled" 
                fullWidth 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                InputProps={{ className: "text-white bg-white/5", sx: { borderRadius: 2 } }}
                InputLabelProps={{ className: "text-indigo-200" }}
              />
              <TextField 
                label="Phone Number *" 
                variant="filled" 
                fullWidth 
                required
                value={phoneNo}
                onChange={e => setPhoneNo(e.target.value)}
                InputProps={{ className: "text-white bg-white/5", sx: { borderRadius: 2 } }}
                InputLabelProps={{ className: "text-indigo-200" }}
              />
              <TextField 
                label="Enrollment Number" 
                variant="filled" 
                fullWidth 
                value={enrollmentNo}
                onChange={e => setEnrollmentNo(e.target.value)}
                InputProps={{ className: "text-white bg-white/5", sx: { borderRadius: 2 } }}
                InputLabelProps={{ className: "text-indigo-200" }}
              />
              <TextField 
                label="Department (e.g. Computer Science)" 
                variant="filled" 
                fullWidth 
                value={departmentName}
                onChange={e => setDepartmentName(e.target.value)}
                InputProps={{ className: "text-white bg-white/5", sx: { borderRadius: 2 } }}
                InputLabelProps={{ className: "text-indigo-200" }}
              />
              <TextField
                select
                label="Gender *"
                variant="filled"
                fullWidth
                required
                value={gender}
                onChange={e => setGender(e.target.value)}
                InputProps={{ className: "text-white bg-white/5", sx: { borderRadius: 2 } }}
                InputLabelProps={{ className: "text-indigo-200" }}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      className: "bg-slate-800 text-white"
                    }
                  }
                }}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Transgender">Transgender</MenuItem>
              </TextField>

              <Button
                type="submit"
                variant="contained"
                disabled={loading || !isCameraReady || !modelsLoaded}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                className="py-4 font-bold rounded-xl mt-4 bg-gradient-to-r from-teal-400 to-indigo-500 hover:from-teal-500 hover:to-indigo-600 shadow-lg transition-transform transform hover:scale-[1.02]"
              >
                {loading ? 'Processing Face Data...' : 'Capture Face & Register'}
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Live Camera Feed */}
        <Grid item xs={12} md={7}>
          <Box className="glass-panel rounded-[2rem] p-6 h-full flex flex-col relative overflow-hidden">
            <Typography variant="h6" className="font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
              <CameraAlt className="text-teal-400" /> Vision AI Scanner
            </Typography>
            
            <Box className="relative w-full flex-grow bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-inner flex items-center justify-center min-h-[400px]">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                onPlay={handleVideoPlay}
                className="w-full h-full object-cover"
              />
              <canvas 
                ref={canvasRef} 
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              {!isCameraReady && (
                <Box className="absolute flex flex-col items-center">
                  <CircularProgress color="primary" className="mb-4" />
                  <Typography className="text-indigo-200 font-bold">
                    {modelsLoaded ? 'Initializing Camera...' : 'Loading Neural Networks...'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
        
        {/* Registered Students List */}
        <Grid item xs={12}>
          <Box className="glass-panel rounded-[2rem] p-8 mt-4">
            <Typography variant="h5" className="font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
              <PeopleIcon className="text-indigo-400" />
              Registered Students
            </Typography>
            
            {studentsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="p-4 text-indigo-200 font-semibold">Name</th>
                      <th className="p-4 text-indigo-200 font-semibold">Email</th>
                      <th className="p-4 text-indigo-200 font-semibold">Phone</th>
                      <th className="p-4 text-indigo-200 font-semibold">Gender</th>
                      <th className="p-4 text-indigo-200 font-semibold">Enrollment No.</th>
                      <th className="p-4 text-indigo-200 font-semibold">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                    {studentsList.map((student, i) => (
                      <motion.tr 
                        custom={i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="show"
                        key={student.id} 
                        className="border-b border-white/5 hover:bg-white/10 transition-colors"
                      >
                        <td className="p-4 text-white font-medium">{student.firstName} {student.lastName}</td>
                        <td className="p-4 text-slate-300 font-mono text-sm">{student.email}</td>
                        <td className="p-4 text-slate-300 font-mono text-sm">{student.phoneNo || 'N/A'}</td>
                        <td className="p-4 text-slate-300 font-mono text-sm">{student.gender || 'Not Specified'}</td>
                        <td className="p-4 text-slate-300 font-mono text-sm">{student.enrollmentNo || 'N/A'}</td>
                        <td className="p-4 text-slate-300">
                          <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm font-medium border border-indigo-500/30">
                            {student.department?.name || 'Unknown'}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <Box className="flex items-center justify-center p-8">
                <Typography className="text-slate-400 italic">No students registered yet.</Typography>
              </Box>
            )}
          </Box>
        </Grid>

      </Grid>
    </Box>
  );
};
