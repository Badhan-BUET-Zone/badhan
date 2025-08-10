import React from 'react';
import { Typography, Stack, Link } from '@mui/material';

const Credits: React.FC = () => {
  return (
    <Stack spacing={1}>
      <Typography variant="h5">Credits</Typography>
      <Typography variant="body1">
        Built with React, TypeScript, MUI, and React Router.
      </Typography>
      <Link href="https://mui.com/" target="_blank" rel="noreferrer">
        MUI Docs
      </Link>
    </Stack>
  );
};

export default Credits;
