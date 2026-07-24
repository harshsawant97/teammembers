import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Popover, Typography, Box, Divider } from '@mui/material';
import { Notifications, CheckCircle, DeleteOutline } from '@mui/icons-material';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/v1/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Optional: Poll every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await axios.patch(`/api/v1/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch(`/api/v1/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    
    // Redirect logic based on notification type or title
    if (notif.type === 'QUERY' || notif.type === 'REMARK' || notif.title.toLowerCase().includes('query')) {
      handleClose();
      if (user?.role === 'STUDENT') {
        navigate('/student/queries');
      } else {
        navigate('/queries');
      }
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  return (
    <>
      <IconButton aria-describedby={id} onClick={handleClick} className="text-white/80 hover:text-white transition-colors relative z-50">
        <Badge badgeContent={unreadCount} color="error" overlap="circular">
          <Notifications />
        </Badge>
      </IconButton>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          className: 'bg-slate-900 border border-white/10 shadow-2xl rounded-xl mt-2 w-80 max-h-96 overflow-y-auto overflow-x-hidden'
        }}
      >
        <Box className="p-4 flex justify-between items-center border-b border-white/5 sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
          <Typography className="text-white font-bold">Notifications</Typography>
          {unreadCount > 0 && (
            <Typography 
              variant="caption" 
              className="text-indigo-400 cursor-pointer hover:text-indigo-300 font-medium"
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </Typography>
          )}
        </Box>
        
        <Box className="flex flex-col">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <Box className="p-8 text-center">
                <Notifications className="text-slate-600 mb-2 text-4xl" />
                <Typography className="text-slate-400 text-sm">No new notifications</Typography>
              </Box>
            ) : (
              notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-white/5 relative group transition-colors cursor-pointer ${notif.read ? 'bg-transparent' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <Typography variant="subtitle2" className={`mb-1 ${notif.read ? 'text-slate-300' : 'text-white font-bold'}`}>
                    {notif.title}
                  </Typography>
                  <Typography variant="body2" className={`text-xs ${notif.read ? 'text-slate-500' : 'text-slate-300'} mb-2`}>
                    {notif.message}
                  </Typography>
                  <Box className="flex justify-between items-center mt-1">
                    <Typography variant="caption" className="text-slate-600 text-[10px]">
                      {new Date(notif.createdAt).toLocaleString()}
                    </Typography>
                    {!notif.read && (
                      <CheckCircle 
                        className="text-indigo-400 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                        fontSize="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id);
                        }}
                      />
                    )}
                  </Box>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </Box>
      </Popover>
    </>
  );
};
