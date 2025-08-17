// TopBar.tsx
import React from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Menu, MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';

type Props = {
  onHamburger: () => void;
  onSignOut: (e?: React.MouseEvent) => void;
  title?: string;
};

const TopBar: React.FC<Props> = ({ onHamburger, onSignOut, title = 'Badhan' }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleSignOutClick = (e: React.MouseEvent) => {
    // close menu before unmounting AppBar
    setAnchorEl(null);
    onSignOut(e);
  };

  return (
    <AppBar position="fixed" elevation={1}>
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="open drawer" onClick={onHamburger} sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>

        <IconButton
          aria-label="more"
          aria-controls={open ? 'topbar-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          color="inherit"
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          id="topbar-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          // ↓ helps prevent click-through issues
          disablePortal
          keepMounted
        >
          <MenuItem onClick={handleSignOutClick}>
            Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
