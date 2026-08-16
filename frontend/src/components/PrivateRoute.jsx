import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <Spinner fullScreen />;

  if (!user) return <Navigate to="/login" replace />;

  if (adminOnly && !isAdmin()) return <Navigate to="/dashboard" replace />;

  return children;
};

export default PrivateRoute;
