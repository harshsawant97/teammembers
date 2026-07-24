import React from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Dashboard, Class, People, Assessment, Settings, ExitToApp, QuestionAnswer, FactCheck } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { NotificationBell } from './NotificationBell';

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'My Classes', icon: <Class />, path: '/classes' },
    { text: 'Previous Classes', icon: <Assessment />, path: '/history' },
    { text: 'Manual Attendance', icon: <FactCheck />, path: '/manual-attendance' },
    { text: 'Students', icon: <People />, path: '/students' },
    { text: 'Queries', icon: <QuestionAnswer />, path: '/queries' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 260,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 260,
          boxSizing: 'border-box',
          backgroundColor: 'transparent',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      <Box className="h-full glass-panel flex flex-col pt-8">
        <Box className="px-8 mb-10 flex justify-between items-center">
          <Typography variant="h5" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight text-xl">
            Attendance
          </Typography>
          <NotificationBell />
        </Box>
        <List className="px-4 flex-1">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItem 
                button 
                key={item.text}
                onClick={() => navigate(item.path)}
                className="relative rounded-xl mb-2 transition-all duration-300 cursor-pointer group"
              >
                {isActive && (
                  <motion.div
                    layoutId="faculty-sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent border-l-4 border-indigo-400 rounded-xl shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <ListItemIcon className={`relative z-10 min-w-[40px] transition-colors ${isActive ? 'text-indigo-400' : 'text-indigo-300 group-hover:text-indigo-200'}`}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  className={`relative z-10 transition-colors ${isActive ? 'text-white font-black' : 'text-slate-300 font-medium group-hover:text-white'}`} 
                  primaryTypographyProps={{ fontWeight: isActive ? 800 : 500 }}
                />
              </ListItem>
            );
          })}
        </List>
        
        <Box className="mt-auto p-6">
          <ListItem 
            button 
            onClick={logout}
            className="rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all duration-300 cursor-pointer border border-red-500/20"
          >
            <ListItemIcon className="text-red-400 min-w-[40px]">
              <ExitToApp />
            </ListItemIcon>
            <ListItemText primary="Logout" className="font-semibold" />
          </ListItem>
        </Box>
      </Box>
    </Drawer>
  );
};
