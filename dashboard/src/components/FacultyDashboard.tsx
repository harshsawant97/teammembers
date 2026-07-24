import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Grid, Button, Avatar, Chip, LinearProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { io, Socket } from 'socket.io-client';
import { PlayArrow, Pause, Stop, CheckCircle, Warning, Timeline, PeopleAlt, Assessment, CameraAlt } from '@mui/icons-material';
import axios from 'axios';
import * as faceapi from 'face-api.js';
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

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNo: string;
}

interface Session {
  id: string;
  status: string;
}

interface ClassData {
  id: string;
  name: string;
  courseCode: string;
  semester: string;
  students: Student[];
  sessions: Session[];
}

interface AttendanceRecord {
  id: string;
  name: string;
  status: string;
  confidence: number;
}

export const FacultyDashboard: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load face-api models
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load AI models", err);
      }
    };
    loadModels();

    // Fetch classes
    axios.get('/api/v1/classes').then(res => {
      setClasses(res.data);
      if (res.data.length > 0) {
        const uniqueSemesters = Array.from(new Set(res.data.map((c: ClassData) => c.semester)));
        const firstSem = uniqueSemesters[0] as string;
        setSelectedSemester(firstSem);
        
        const semClasses = res.data.filter((c: ClassData) => c.semester === firstSem);
        if (semClasses.length > 0) {
          setSelectedClass(semClasses[0]);
          if (semClasses[0].sessions.length > 0) {
            setCurrentSession(semClasses[0].sessions[0]);
          }
        }
      }
    });

    // Fetch Face Embeddings for verification
    axios.get('/api/v1/students/embeddings').then(res => {
      const formatted = res.data.map((s: any) => {
        const descriptors = s.descriptors.map((d: any[]) => new Float32Array(d));
        return new faceapi.LabeledFaceDescriptors(s.studentId, descriptors); // use studentId as label
      });
      if (formatted.length > 0) {
        const storedThreshold = localStorage.getItem('setting_confidenceThreshold');
        const threshold = storedThreshold ? parseFloat(storedThreshold) : 0.65;
        // In face-api.js, maxDescriptorDistance is (1 - confidence), so if confidence is 0.65, maxDistance is 0.35.
        // Or wait, is distance 0.55? Typically face-api FaceMatcher takes `maxDescriptorDistance`.
        // A threshold of 0.65 means we want distance to be AT MOST 0.35.
        // Let's pass (1 - threshold).
        setFaceMatcher(new faceapi.FaceMatcher(formatted, 1 - threshold));
      }
    }).catch(err => console.error("Failed to fetch embeddings", err));

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on('session_status_changed', (data) => {
      setCurrentSession(prev => prev ? { ...prev, status: data.status } : null);
      if (data.status !== 'ACTIVE') stopWebcam();
    });

    newSocket.on('attendance_marked', (data) => {
      setAttendanceList((prev) => {
        const exists = prev.find(s => s.id === data.student.id);
        if (exists) return prev;
        return [...prev, { 
          id: data.student.id, 
          name: `${data.student.firstName} ${data.student.lastName}`, 
          status: data.status, 
          confidence: data.confidence 
        }];
      });
    });

    return () => {
      newSocket.close();
      stopWebcam();
    };
  }, []);

  useEffect(() => {
    if (socket && currentSession) {
      socket.emit('join_session', currentSession.id);
    }
  }, [socket, currentSession]);

  const startSession = async () => {
    if (!selectedClass) return;
    
    try {
      let sessionId = currentSession?.id;
      if (!sessionId || currentSession?.status === 'COMPLETED') {
        const res = await axios.post('/api/v1/sessions', { classId: selectedClass.id });
        sessionId = res.data.id;
        setCurrentSession(res.data);
        setAttendanceList([]); // Clear previous attendance
      }

      await axios.post(`/api/v1/sessions/${sessionId}/start`);
      
      // Start Webcam
      startWebcam();
    } catch (e) {
      console.error(e);
    }
  };

  const endSession = async () => {
    if (!currentSession) return;
    try {
      await axios.post(`/api/v1/sessions/${currentSession.id}/end`);
      stopWebcam();
    } catch (e) {
      console.error(e);
    }
  };

  const startWebcam = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setIsTracking(true);
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopWebcam = () => {
    setIsTracking(false);
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

    trackingInterval.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !isTracking) return;

      const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (detections.length > 0 && selectedClass && currentSession && faceMatcher) {
        const presentIds = attendanceList.map(a => a.id);
        const classStudents = selectedClass.students || [];

        resizedDetections.forEach(detection => {
          const match = faceMatcher.findBestMatch(detection.descriptor);
          
          let boxLabel = 'Unknown';
          let boxColor = 'red';

          // Concentration Calculation
          const pts = detection.landmarks.positions;
          const nose = pts[30];
          const leftEdge = pts[0];
          const rightEdge = pts[16];
          
          let concentration = 0;
          if (nose && leftEdge && rightEdge) {
            const leftDist = nose.x - leftEdge.x;
            const rightDist = rightEdge.x - nose.x;
            const min = Math.min(leftDist, rightDist);
            const max = Math.max(leftDist, rightDist);
            concentration = max > 0 ? (min / max) : 0;
          }

          const isConcentrating = concentration >= 0.75;
          const concentrationText = ` | Focus: ${Math.round(concentration * 100)}%`;

          if (match.label !== 'unknown') {
            const student = classStudents.find(s => s.id === match.label);
            boxLabel = student ? `${student.firstName} ${student.lastName}` : match.label;
            
            if (isConcentrating) {
              boxColor = 'green';
              if (!presentIds.includes(match.label)) {
                // Send to webhook
                axios.post('/api/v1/attendance/webhook', {
                  sessionId: currentSession.id,
                  studentId: match.label,
                  confidenceScore: 1 - match.distance
                }).catch(console.error);
                
                // Prevent spamming
                presentIds.push(match.label);
              }
            } else {
              // Highlight that they are recognized but not paying attention
              boxColor = 'orange';
            }
          }

          const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
            label: `${boxLabel} (${Math.round((1 - match.distance) * 100)}%)${concentrationText}`,
            boxColor
          });
          drawBox.draw(canvasRef.current!);
        });
      } else {
        // Just draw boxes without labels if no matcher is ready
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
      }
    }, 500); // Process every 500ms
  };

  const totalStudents = selectedClass?.students?.length || 0;
  const presentCount = attendanceList.length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const status = currentSession?.status || 'NOT STARTED';

  const uniqueSemesters = Array.from(new Set(classes.map(c => c.semester)));
  const filteredClasses = classes.filter(c => c.semester === selectedSemester);

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
    <PageWrapper className="p-4 md:p-8 min-h-screen relative overflow-hidden">
      <Box className="absolute top-[-10%] right-[-5%] w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      <Box className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-teal-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 max-w-7xl mx-auto">
        <Grid container spacing={4}>
          
          <Grid item xs={12}>
            <LegendaryCard className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center">
            <Box>
              <Typography variant="h3" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-4 tracking-tight">
                Dashboard
              </Typography>
              {uniqueSemesters.length > 0 ? (
                <Box className="flex gap-4">
                  <FormControl variant="filled" sx={{ m: 1, minWidth: 200, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <InputLabel className="text-white">Semester</InputLabel>
                    <Select
                      value={selectedSemester}
                      onChange={(e) => {
                        const sem = e.target.value;
                        setSelectedSemester(sem);
                        const semClasses = classes.filter(c => c.semester === sem);
                        setSelectedClass(semClasses.length > 0 ? semClasses[0] : null);
                        setCurrentSession(semClasses.length > 0 && semClasses[0].sessions.length > 0 ? semClasses[0].sessions[0] : null);
                      }}
                      className="text-white font-bold"
                    >
                      {uniqueSemesters.map(sem => (
                        <MenuItem key={sem} value={sem}>{sem}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl variant="filled" sx={{ m: 1, minWidth: 300, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <InputLabel className="text-white">Select Class</InputLabel>
                    <Select
                      value={selectedClass?.id || ''}
                      onChange={(e) => {
                        const c = filteredClasses.find(x => x.id === e.target.value);
                        if (c) {
                          setSelectedClass(c);
                          setCurrentSession(c.sessions.length > 0 ? c.sessions[0] : null);
                        }
                      }}
                      className="text-white font-bold"
                      disabled={filteredClasses.length === 0}
                    >
                      {filteredClasses.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.courseCode}: {c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              ) : (
                <Typography className="text-white">No classes assigned.</Typography>
              )}
            </Box>
            <Box className="mt-4 md:mt-0 text-right">
              <Typography variant="overline" className="text-indigo-200 block mb-1 font-bold">Session Status</Typography>
              <Chip 
                label={status} 
                color={status === 'ACTIVE' ? 'success' : status === 'PAUSED' ? 'warning' : 'default'} 
                className={`font-extrabold tracking-widest px-6 py-6 rounded-2xl text-md shadow-[0_0_15px_rgba(0,0,0,0.2)] ${status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : ''}`}
                variant="outlined"
              />
            </Box>
            </LegendaryCard>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={4}>
            <LegendaryCard className="h-full flex flex-col justify-center items-center text-center p-6">
            <PeopleAlt className="text-indigo-400 text-5xl mb-3 opacity-80 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <Typography variant="h2" className="font-black text-white"><AnimatedNumber value={presentCount} /> <span className="text-2xl text-indigo-200 font-medium">/ <AnimatedNumber value={totalStudents} /></span></Typography>
            <Typography variant="subtitle1" className="text-indigo-200 font-medium mt-1 uppercase tracking-widest text-xs">Students Present</Typography>
            </LegendaryCard>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <LegendaryCard className="h-full flex flex-col justify-center p-6">
            <Box className="flex justify-between items-center mb-4">
              <Typography variant="subtitle1" className="text-indigo-200 font-medium uppercase tracking-widest text-xs">Attendance Rate</Typography>
              <Assessment className="text-teal-400 opacity-80 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
            </Box>
            <Typography variant="h3" className="font-black text-white mb-4"><AnimatedNumber value={attendanceRate} suffix="%" /></Typography>
            <LinearProgress 
              variant="determinate" 
              value={attendanceRate} 
              sx={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundImage: 'linear-gradient(to right, #2dd4bf, #818cf8)' } }} 
            />
            </LegendaryCard>
          </Grid>

          {/* Controls Panel */}
          <Grid item xs={12} md={4}>
            <LegendaryCard className="p-6 h-full flex flex-col justify-center gap-4">
            <Button 
              variant="contained" 
              startIcon={<PlayArrow />}
              onClick={startSession}
              disabled={status === 'ACTIVE' || !modelsLoaded}
              className={`rounded-xl py-3 font-bold shadow-lg transition-all duration-300 ${status !== 'ACTIVE' ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600' : 'bg-white/5 text-white/30'}`}
            >
              {modelsLoaded ? 'Start Webcam Tracking' : 'Loading AI Models...'}
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Stop />}
              onClick={endSession}
              disabled={status !== 'ACTIVE'}
              className={`rounded-xl py-3 font-bold shadow-lg transition-all duration-300 ${status === 'ACTIVE' ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700' : 'bg-white/5 text-white/30'}`}
            >
              End Session
            </Button>
            </LegendaryCard>
          </Grid>

          {/* Live Camera Feed */}
          <Grid item xs={12} md={6}>
            <LegendaryCard className="p-6 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
            <Typography variant="h6" className="font-bold text-white mb-4 w-full text-left flex items-center gap-2">
              <CameraAlt className="text-teal-400" /> Live Vision
            </Typography>
            <Box className="relative w-full aspect-video bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
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
              {!isTracking && (
                <Box className="absolute inset-0 flex flex-col items-center justify-center text-indigo-300/40">
                  <Warning className="w-16 h-16 mb-2 opacity-50" />
                  <Typography className="font-bold">Webcam Offline</Typography>
                </Box>
              )}
            </Box>
            </LegendaryCard>
          </Grid>

          {/* Live Attendance Grid */}
          <Grid item xs={12} md={6}>
            <LegendaryCard className="p-6 h-[400px] overflow-y-auto custom-scrollbar">
            <Typography variant="h6" className="font-bold text-white mb-6 flex items-center gap-2">
              <CheckCircle className="text-emerald-400" /> Verified Today
            </Typography>
            
            {attendanceList.length === 0 ? (
              <Typography className="text-indigo-200/50 text-center mt-10">No students marked present yet.</Typography>
            ) : (
              <Box className="flex flex-col gap-3">
                {attendanceList.map((student) => (
                  <motion.div 
                    key={student.id} 
                    initial={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="glass-card flex items-center p-4 rounded-xl border border-white/10"
                  >
                    <Avatar className="bg-gradient-to-br from-teal-400 to-indigo-500 font-bold border border-white/20 shadow-lg shadow-teal-500/30">
                      {student.name.charAt(0)}
                    </Avatar>
                    <Box className="ml-4 flex-1">
                      <Typography className="font-bold text-white tracking-wide">{student.name}</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={student.confidence * 100} 
                        sx={{ mt: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { backgroundColor: student.confidence > 0.8 ? '#34d399' : '#fbbf24', boxShadow: '0 0 10px rgba(52,211,153,0.5)' } }} 
                      />
                    </Box>
                    <Typography className="text-emerald-400 font-black ml-4 text-lg">
                      {(student.confidence * 100).toFixed(0)}%
                    </Typography>
                  </motion.div>
                ))}
              </Box>
            )}
            </LegendaryCard>
          </Grid>

        </Grid>
      </motion.div>
    </PageWrapper>
  );
};
