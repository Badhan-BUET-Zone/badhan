import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailIcon from '@mui/icons-material/Mail';
import {Drawer} from "@mui/material";
import {useState} from "react";
import {Link} from "react-router-dom";

import {useNavigate} from "react-router-dom";

export default function TopBar() {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                        onClick={()=>{setDrawerOpen(true)}}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Badhan Admin
                    </Typography>
                </Toolbar>
            </AppBar>
            <Drawer
                anchor={'left'}
                open={drawerOpen}
                onClose={()=>{setDrawerOpen(false)}}
            >
                <Box
                    sx={{'width':'250px'}}
                    role="presentation"
                    onClick={()=>{}}
                    onKeyDown={()=>{}}
                >
                <List>
                    {[
                        {link:'/management/version',text:'Version'},
                        {link:'/management/contributors',text:'Contributors'},
                        {link:'/management/super-admins',text:'Super Admins'},
                        {link: '/backup-restore',text: 'Backup & Restore'},
                        {link: '/signin',text: 'Sign Out'}
                    ].map((routeInfo, index) => (
                        <ListItem key={routeInfo.text} component={Link} to={routeInfo.link}>
                            <ListItemButton>
                                <ListItemIcon>
                                    {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
                                </ListItemIcon>
                                <ListItemText primary={routeInfo.text} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                </Box>
            </Drawer>
        </Box>
    );
}
