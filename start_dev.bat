@echo off
echo Starting Smart Attendance Development Environment (SQLite Mode)...

echo [1/2] Starting Node.js Backend...
start cmd.exe /k "cd backend && npx prisma db push && npm run dev"

echo [2/2] Starting Vite React Dashboard...
start cmd.exe /k "cd dashboard && npm run dev"

echo All services have been started!
echo The backend is running on port 3000
echo The dashboard is running on port 5173
echo You can now close this window.
