import React from 'react';
import {
  Drawer, Toolbar, List, ListItemButton, ListItemText, Divider
} from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  drawerWidth?: number;
};

const NavDrawer: React.FC<Props> = ({ open, onClose, drawerWidth = 260 }) => {
  const location = useLocation();

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    textDecoration: 'none',
    color: 'inherit',
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': { width: drawerWidth },
      }}
    >
      <Toolbar />
      <Divider />
      <List onClick={onClose}>
        <NavLink to="/" style={linkStyle} end>
          <ListItemButton selected={location.pathname === '/'}>
            <ListItemText primary="Home" />
          </ListItemButton>
        </NavLink>
        <NavLink to="/profile" style={linkStyle}>
          <ListItemButton selected={location.pathname.startsWith('/profile')}>
            <ListItemText primary="My Profile" />
          </ListItemButton>
        </NavLink>
        <NavLink to="/credits" style={linkStyle}>
          <ListItemButton selected={location.pathname.startsWith('/credits')}>
            <ListItemText primary="Credits" />
          </ListItemButton>
        </NavLink>
      </List>
    </Drawer>
  );
};

export default NavDrawer;
