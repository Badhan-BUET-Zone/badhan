// @ts-nocheck
// material-ui
import {
    Button,
    Card,
    CardContent,
    Chip,
    MenuItem, SelectChangeEvent,
    Typography
} from '@mui/material';

import Select  from '@mui/material/Select';
// project imports
import MainCard from '../../ui-component/cards/MainCard';
import MyTextField from "../../ui-component/MyTextField";
import {Box} from "@mui/material";
import React from 'react';
import MyButton from "../../ui-component/MyButton";

// ==============================|| SAMPLE PAGE ||============================== //

const Contributors = () => {
    const [memberType, setMember] = React.useState('Legacy Developer');

    const [isAddContributionShown, setIsAddContributionShown] = React.useState(false);
    const [isAddLinkShown, setIsAddLinkShown] = React.useState(false);

    const handleChange = (event: SelectChangeEvent) => {
        setMember(event.target.value as string);
    };

    return(
        <MainCard title="Manage Contributors">
            <Card variant={'outlined'} sx={{maxWidth: '300px'}}>
                <CardContent>
                    <Button
                        component="label"
                    >
                        <Box
                            component="img"
                            sx={{
                                height: 100,
                                borderRadius: '50px'
                            }}
                            alt="The house from the offer."
                            src="https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fmahathir.jpg?alt=media"
                        />
                        <input
                            type="file"
                            hidden
                        />
                        <div style={{
                            position: 'absolute',
                            color: 'white',
                            top: '90%',
                            left: '50%',
                            padding: '5px',
                            transform: 'translate(-50%, -90%)',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderRadius: '20px'
                        }} >
                            Update
                        </div>
                    </Button>
                    <MyTextField id={'name'} label={'Name of Contributor'}/>
                    <br/>
                    <MyTextField id={'duration'} label={'Duration of Service'}/>
                    <br/>
                    <Select
                        sx={{margin: '10px'}}
                        labelId="Member Type"
                        id="member1"
                        value={memberType}
                        onChange={handleChange}
                    >
                        <MenuItem value={'Active Developer'}>Active Developer</MenuItem>
                        <MenuItem value={'Contributors from Badhan'}>Contributors from Badhan</MenuItem>
                        <MenuItem value={'Legacy Developer'}>Legacy Developer</MenuItem>
                    </Select>
                    {!isAddContributionShown && <MyButton text={'Show Add Contribution'} color={'primary'} onClick={() => {
                        setIsAddContributionShown(true)
                    }}/>}
                    {isAddContributionShown && <Card variant={'outlined'}>
                        <CardContent>
                            <MyTextField id={'contributions'} label={'Add Contribution'}/>
                            <MyButton text={'Add Contribution'} color={'primary'} onClick={()=>{}}/>
                            <MyButton text={'Cancel'} color={'warning'} onClick={()=>{setIsAddContributionShown(false)}}/>
                        </CardContent>
                    </Card>}

                    <Box sx={{margin: '10px'}}>
                        <Typography sx={{margin: '10px'}} variant={'body'}>
                            Contributions:
                        </Typography>
                        <Chip sx={{margin: '5px'}} label="UX Designer" onDelete={() => {
                        }}/>
                        <Chip sx={{margin: '5px'}} label="Backend Engineer" onDelete={() => {
                        }}/>
                    </Box>

                    {!isAddLinkShown && <MyButton text={'Show Add Link'} color={'primary'} onClick={() => {
                        setIsAddLinkShown(true)
                    }}/>}
                    {isAddLinkShown && <Card variant={'outlined'}>
                        <CardContent>
                            <MyTextField id={'linkColor'} label={'Add Color'}/>
                            <MyTextField id={'linkIcon'} label={'Add Link Icon'}/>
                            <MyTextField id={'link'} label={'Add Profile Link'}/>
                            <MyButton text={'Add Link'} color={'primary'} onClick={() => {}}/>
                            <MyButton text={'Cancel'} color={'warning'} onClick={()=>{setIsAddLinkShown(false)}}/>
                        </CardContent>
                    </Card>}


                    <Box sx={{margin: '10px'}}>
                        <Typography sx={{margin: '10px'}} variant={'body'}>
                            Links:
                        </Typography>

                    </Box>

                    <Card variant={'outlined'}>
                        <CardContent>
                            <Typography variant={'body1'} sx={{width: '200px', overflowWrap: 'break-word'}}>
                                blue - facebook - <a href={'https://facebook.com/MirMahathirMohammad'}>https://facebook.com/MirMahathirMohammad</a>
                            </Typography>
                            <MyButton text={'Delete'} color={'warning'}/>
                        </CardContent>
                    </Card>

                    <MyButton text={'Save Changes of Contributor'} color={'primary'}/>

                </CardContent>
            </Card>
        </MainCard>
    )
};

export default Contributors;
