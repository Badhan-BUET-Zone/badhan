import React from 'react';
import { Typography, Stack, TextField, Button } from '@mui/material';

const Profile: React.FC = () => {
  // demo-only fields
  return (
    <Stack spacing={2} maxWidth={400}>
      <Typography variant="h5">My Profile</Typography>
      <TextField label="Full Name" placeholder="John Doe" />
      <TextField label="Phone" placeholder="+1 555-1234" />
      <Button variant="contained">Save</Button>
    </Stack>
  );
};

export default Profile;
