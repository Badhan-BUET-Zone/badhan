// @ts-nocheck
// material-ui
import {
    Card,
    CardContent,
    Chip,
    Fab, Grid,
    List,
    ListItem,
    ListItemButton,
    ListItemText, MenuItem, Paper, SelectChangeEvent,
    Stack,
    Typography
} from '@mui/material';

import { IconPlus } from '@tabler/icons';
import { styled } from '@mui/material/styles';
import Select  from '@mui/material/Select';
// project imports
import MainCard from '../../ui-component/cards/MainCard';
import MyTextField from "../../ui-component/MyTextField";
import {Box} from "@mui/material";
import React from 'react';

// ==============================|| SAMPLE PAGE ||============================== //

const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

const Contributors = () => {
    const [memberType, setMember] = React.useState('Legacy Developer');

    const handleChange = (event: SelectChangeEvent) => {
        setMember(event.target.value as string);
    };

    return(
        <MainCard title="Sample Card">
            <Card variant={'outlined'} sx={{maxWidth: '300px'}}>
                <CardContent>
                    <MyTextField id={'name'} label={'Name of Contributor'}/>
                    <br/>
                    <MyTextField id={'duration'} label={'Duration of Service'}/>
                    <br/>
                    <Box sx={{flexGrow: 1, maxWidth: '220px'}}>
                        <Grid container>
                            <Grid item xs={9} md={9}>
                                <Item><MyTextField id={'contributions'} label={'Add Contribution'}/></Item>
                            </Grid>
                            <Grid item xs={3} md={3}>
                                <Item><Fab size="medium" color="primary" aria-label="add">
                                    <IconPlus/>
                                </Fab></Item>
                            </Grid>
                        </Grid>
                    </Box>

                    <Box sx={{margin: '10px'}}>
                        <Typography sx={{margin: '10px'}} variant={'body'}>
                            Contributions:
                        </Typography>
                        <Chip sx={{margin: '5px'}} label="UX Designer" onDelete={() => {
                        }}/>
                        <Chip sx={{margin: '5px'}} label="Backend Engineer" onDelete={() => {
                        }}/>
                    </Box>
                    <Select
                        sx={{margin: '5px'}}
                        labelId="Member Type"
                        id="member1"
                        value={memberType}
                        onChange={handleChange}
                    >
                        <MenuItem value={'Active Developer'}>Active Developer</MenuItem>
                        <MenuItem value={'Contributors from Badhan'}>Contributors from Badhan</MenuItem>
                        <MenuItem value={'Legacy Developer'}>Legacy Developer</MenuItem>
                    </Select>
                </CardContent>
            </Card>
        </MainCard>
    )
};

export default Contributors;
