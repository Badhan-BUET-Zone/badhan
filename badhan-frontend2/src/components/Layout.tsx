// Layout.tsx
import React from 'react';
import { Box, Toolbar } from '@mui/material';
import TopBar from './TopBar';
import NavDrawer from './NavDrawer';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleDrawer, closeDrawer } from '../store/slices/uiSlice';
import { signOut } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isSignedIn = useAppSelector(s => s.auth.isSignedIn);
  const drawerOpen = useAppSelector(s => s.ui.drawerOpen);

  const handleSignOut = (e?: React.MouseEvent) => {
    // prevent the click from “falling through”
    e?.preventDefault();
    e?.stopPropagation();

    dispatch(signOut());

    // defer navigation to the next tick so unmounts finish before routing
    setTimeout(() => navigate('/signin', { replace: true }), 0);
  };

  if (!isSignedIn) return <>{children}</>;

  return (
    <Box sx={{ display: 'flex' }}>
      <TopBar
        onHamburger={() => dispatch(toggleDrawer())}
        onSignOut={handleSignOut}
      />
      <NavDrawer
        open={drawerOpen}
        onClose={() => dispatch(closeDrawer())}
      />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
