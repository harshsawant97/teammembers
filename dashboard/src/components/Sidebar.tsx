import React from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Dashboard, Class, People, Assessment, Settings, ExitToApp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'My Classes', icon: <Class />, path: '/classes' },
    { text: 'Previous Classes', icon: <Assessment />, path: '/history' },
    { text: 'Students', icon: <People />, path: '/students' },
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
        <Box className="px-8 mb-10">
          <Typography variant="h5" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">
            SmartAttendance
          </Typography>
        </Box>
        <List className="px-4 flex-1">
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.text}
              onClick={() => navigate(item.path)}
              className="rounded-xl mb-2 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
            >
              <ListItemIcon className="text-indigo-300 min-w-[40px] group-hover:text-indigo-200 transition-colors">
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                className="text-slate-200 font-medium group-hover:text-white transition-colors" 
              />
            </ListItem>
          ))}
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
