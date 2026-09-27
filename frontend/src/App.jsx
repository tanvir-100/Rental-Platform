import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import TenantDashboard from './pages/TenantDashboard.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import Navbar from './components/Navbar.jsx';

// Error Boundary to catch React component errors gracefully
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    // In production, you could send to an error reporting service like Sentry
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="card-padded max-w-md text-center">
            <h2 className="font-display text-xl font-semibold text-black mb-2">Something went wrong</h2>
            <p className="text-body-sm text-gray-500 mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="mt-6 text-left text-body-xs text-gray-500">
                <summary className="cursor-pointer mb-2">Error Details (Development)</summary>
                <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'owner' ? '/owner' : '/tenant'} replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <ErrorBoundary>
      <SocketProvider>
        <div className="min-h-screen bg-gray-50">
          {user && <Navbar />}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/tenant"
              element={
                <ProtectedRoute role="tenant">
                  <TenantDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner"
              element={
                <ProtectedRoute role="owner">
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<HomeRedirect />} />
          </Routes>
        </div>
      </SocketProvider>
    </ErrorBoundary>
  );
}
