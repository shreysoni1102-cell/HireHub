import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import JobDetail from './pages/JobDetail.jsx';
import SeekerApplications from './pages/SeekerApplications.jsx';
import RecruiterDashboard from './pages/RecruiterDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ATSChecker from './pages/ATSChecker.jsx';
import Chat from './pages/Chat.jsx';
import SeekerProfile from './pages/SeekerProfile.jsx';
import InterviewLobby from './pages/InterviewLobby.jsx';
import InterviewSession from './pages/InterviewSession.jsx';
import InterviewReport from './pages/InterviewReport.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/seeker/applications"
          element={
            <ProtectedRoute roles={['user']}>
              <SeekerApplications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ats-checker"
          element={
            <ProtectedRoute roles={['user']}>
              <ATSChecker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seeker/profile"
          element={
            <ProtectedRoute roles={['user']}>
              <SeekerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seeker/interview"
          element={
            <ProtectedRoute roles={['user']}>
              <InterviewLobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seeker/interview/:id"
          element={
            <ProtectedRoute roles={['user']}>
              <InterviewSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seeker/interview/:id/report"
          element={
            <ProtectedRoute roles={['user']}>
              <InterviewReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:roomId"
          element={
            <ProtectedRoute roles={['user', 'recruiter']}>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter"
          element={
            <ProtectedRoute roles={['recruiter']}>
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
