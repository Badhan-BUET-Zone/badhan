// material-ui

// project imports
import MyButton from "../../ui-component/MyButton";
import React from 'react'
import {Fragment} from "react";
import {BackupCard} from "../../ui-component/backup-restore/BackupCard";
import {Typography} from "@mui/material";
import MyMainCard from "../../ui-component/cards/MyMainCard";

// ==============================|| SAMPLE PAGE ||============================== //

const BackupRestore = () => (
    <Fragment>
        <MyMainCard title="Manage All Backups of Database">
            <MyButton text={'Create New Backup'} color={'primary'} onClick={()=>{}}/>
            <MyButton text={'Trim Backups'} color={'warning'} onClick={()=>{}}/>
        </MyMainCard>
        <MyMainCard title="List of All Backups">
            <Typography variant={'subtitle1'} sx={{margin: '5px'}}>
                Latest Backup
            </Typography>
            <BackupCard/>
            <Typography variant={'subtitle1'} sx={{margin: '5px'}}>
                Older Backups
            </Typography>
            <BackupCard/>
            <BackupCard/>
        </MyMainCard>
    </Fragment>
);

export default BackupRestore;
