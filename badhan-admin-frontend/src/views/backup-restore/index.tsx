// @ts-nocheck
// material-ui

// project imports
import MainCard from '../../ui-component/cards/MainCard';
import MyButton from "../../ui-component/MyButton";
import React from 'react'
import {BackupCard} from "../../ui-component/backup-restore/BackupCard";
import {Typography} from "@mui/material";

// ==============================|| SAMPLE PAGE ||============================== //

const BackupRestore = () => (
    <React.Fragment>
        <MainCard title="Manage All Backups of Database">
            <MyButton text={'Create New Backup'} color={'primary'}/>
            <MyButton text={'Trim Backups'} color={'warning'}/>
        </MainCard>
        <MainCard title="List of All Backups">
            <Typography variant={'subtitle1'} sx={{margin: '5px'}}>
                Latest Backup
            </Typography>
            <BackupCard/>
            <Typography variant={'subtitle1'} sx={{margin: '5px'}}>
                Older Backups
            </Typography>
            <BackupCard/>
            <BackupCard/>
        </MainCard>
    </React.Fragment>
);

export default BackupRestore;
