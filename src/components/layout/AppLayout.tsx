'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import PieChartIcon from '@mui/icons-material/PieChart'; // Portfolio
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // Luck/Wins
import GroupsIcon from '@mui/icons-material/Groups'; // Players
import SportsFootballIcon from '@mui/icons-material/SportsFootball'; // Brand icon

const drawerWidth = 240;

const MENU_ITEMS = [
  { text: 'Home', href: '/', icon: <HomeIcon /> },
  { text: 'Portfolio Tracker', href: '/portfolio', icon: <PieChartIcon /> },
  { text: 'Luck Analyzer', href: '/expected-wins', icon: <TrendingUpIcon /> },
  { text: 'Player Database', href: '/players', icon: <GroupsIcon /> },
];

import { useUser } from '@/context/UserContext';
import {
  Avatar,
  Menu,
  MenuItem as MuiMenuItem
} from '@mui/material';

// ... existing code ...

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  
  // Avatar Menu State
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleLogout = () => {
    handleClose();
    logout();
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

// ... existing drawerContent ...

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* Top Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1 
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {MENU_ITEMS.find(i => i.href === pathname)?.text || 'Fantasy Football'}
          </Typography>

          {/* User Avatar */}
          {user && (
            <div>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
                sx={{ p: 0 }}
              >
                <Avatar 
                  src={`https://sleepercdn.com/avatars/${user.avatar}`} 
                  alt={user.display_name}
                />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MuiMenuItem disabled>{user.display_name}</MuiMenuItem>
                <Divider />
                <MuiMenuItem onClick={handleLogout}>Change User</MuiMenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>
// ... rest of component

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile Drawer (Temporary) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }} // Better open performance on mobile.
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer (Permanent) */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        {children}
      </Box>
    </Box>
  );
}
