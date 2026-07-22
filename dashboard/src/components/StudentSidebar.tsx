import React from 'react';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Dashboard, Person, Logout, Face, Class as ClassIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const StudentSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { text: 'Overview', icon: <Dashboard />, path: '/student/dashboard' },
    { text: 'My Classes', icon: <ClassIcon />, path: '/student/classes' },
    { text: 'My Profile', icon: <Person />, path: '/student/profile' },
  ];

  return (
    <Box className="w-64 h-screen bg-slate-900 border-r border-white/10 flex flex-col justify-between py-6 sticky top-0 shrink-0 z-50">
      <Box>
        <Box className="px-6 mb-10">
          <Typography variant="h5" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 flex items-center gap-2">
            <Face /> Student Portal
          </Typography>
        </Box>
        <List className="px-3">
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.text} 
              onClick={() => navigate(item.path)}
              className={`mb-2 rounded-xl transition-all duration-300 cursor-pointer ${
                location.pathname === item.path 
                  ? 'bg-gradient-to-r from-teal-500/20 to-transparent border-l-4 border-teal-400' 
                  : 'hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <ListItemIcon className={`${location.pathname === item.path ? 'text-teal-400' : 'text-slate-400'}`}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                className={`${location.pathname === item.path ? 'text-teal-100 font-bold' : 'text-slate-400'}`}
                primaryTypographyProps={{ fontWeight: location.pathname === item.path ? 700 : 500 }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
      <Box className="px-3">
        <ListItem 
          button 
          onClick={logout}
          className="rounded-xl transition-all duration-300 cursor-pointer hover:bg-red-500/10 hover:text-red-400 group"
        >
          <ListItemIcon className="text-slate-400 group-hover:text-red-400">
            <Logout />
          </ListItemIcon>
          <ListItemText 
            primary="Sign Out" 
            className="text-slate-400 group-hover:text-red-400 font-medium" 
          />
        </ListItem>
      </Box>
    </Box>
  );
};
