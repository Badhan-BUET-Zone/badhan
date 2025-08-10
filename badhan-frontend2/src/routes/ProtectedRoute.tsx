import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

const ProtectedRoute: React.FC = () => {
  const isSignedIn = useAppSelector(s => s.auth.isSignedIn);
  return isSignedIn ? <Outlet /> : <Navigate to="/signin" replace />;
};

export default ProtectedRoute;
