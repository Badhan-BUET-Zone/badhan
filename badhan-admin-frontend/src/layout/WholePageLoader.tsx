import * as React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

export default function WholePageLoader() {
    return (
        <Box   position="fixed"
               top={0}
               height="60px"
               width="100%">
            <LinearProgress />
        </Box>
    );
}
