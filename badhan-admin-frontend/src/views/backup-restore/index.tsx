// material-ui

// project imports
import MyButton from "../../ui-component/MyButton";
import React, {useEffect, useState} from 'react'
import {Fragment} from "react";
import {BackupCard} from "../../ui-component/backup-restore/BackupCard";
import {Typography} from "@mui/material";
import MyMainCard from "../../ui-component/cards/MyMainCard";
import {wait} from "../../utils/dummyAPI";
import MySkeleton from "../../ui-component/MySkeleton";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notificationModel";

// ==============================|| SAMPLE PAGE ||============================== //

const dummyBackups: number[] = [1650383925655, 1650383935655, 1650481935655, 1657383925655, 1680383935655, 1650441935655]
// const dummyBackups: number[] = []

const BackupRestore = () => {
    const [backupTimestamps, setBackupTimestamps] = useState<number[]>([])
    const [backupTimestampsLoaderFlag, setBackupTimestampsLoaderFlag] = useState<boolean>(true)
    const [backupTimestampsErrorFlag, setBackupTimestampsErrorFlag] = useState<boolean>(false)

    const [restoreToTestFlagsArray, setRestoreToTestFlagsArray] = useState<boolean[]>([])
    const [restoreToProductionFlagsArray, setRestoreToProductionFlagsArray] = useState<boolean[]>([])
    const [deleteLoaderFlagsArray, setDeleteLoaderFlagsArray] = useState<boolean[]>([])

    const [createNewBackupLoaderFlag, setCreateNewBackupLoaderFlag] = useState<boolean>(false)
    const [trimBackupsLoaderFlag, setTrimBackupsLoaderFlag] = useState<boolean>(false)

    const dispatch = useDispatch()

    const setFlagForSpecificIndex = (prevState: boolean[], index: number) => {
        const newState = [...prevState]
        newState[index] = true;
        return newState
    }

    const setDeleteFlagForSpecificIndex = (index: number) => {
        setDeleteLoaderFlagsArray(prevState => setFlagForSpecificIndex(prevState, index))
    }
    const setRestoreToProductionFlagForSpecificIndex = (index: number) => {
        setRestoreToProductionFlagsArray(prevState => setFlagForSpecificIndex(prevState, index))
    }
    const setRestoreToTestFlagForSpecificIndex = (index: number) => {
        setRestoreToTestFlagsArray(prevState => setFlagForSpecificIndex(prevState, index))
    }

    useEffect(() => {
        const loadBackups = async () => {
            try {
                setBackupTimestampsLoaderFlag(prevState => true)
                await wait();
                setBackupTimestamps(prevState => dummyBackups)
                setDeleteLoaderFlagsArray(prevState => Array(dummyBackups.length).fill(false))
                setRestoreToProductionFlagsArray(prevState => Array(dummyBackups.length).fill(false))
                setRestoreToTestFlagsArray(prevState => Array(dummyBackups.length).fill(false))
                dispatch(new NotificationSuccess('Successfully loaded backups'))
            } catch (e) {
                setBackupTimestampsErrorFlag(prevState => true)
                dispatch(new NotificationError('Error in loading backups'))
            } finally {
                setBackupTimestampsLoaderFlag(prevState => false)
            }
        }
        loadBackups()
    }, [dispatch])

    const handleBackupDelete = async (timestamp: number, index: number)=>{
        console.log(`inside handleBackupDelete: timestamp ${timestamp} index ${index}`)
        setDeleteFlagForSpecificIndex(index)
        try{
            await wait();
            setBackupTimestamps(prevState => {
                return prevState.filter(backup=> backup!== timestamp)
            })
            dispatch(new NotificationSuccess('Successfully deleted backup'))
        }catch (e) {
            dispatch(new NotificationError('Error in deleting backup'))
        }finally {
            setDeleteLoaderFlagsArray(prevState => Array(backupTimestamps.length).fill(false))
        }
    }
    const handleRestoreToTest = async (timestamp: number, index: number)=>{
        console.log(`inside handleRestoreToTest: timestamp ${timestamp} index ${index}`)
        setRestoreToTestFlagForSpecificIndex(index)
        try{
            await wait();
            dispatch(new NotificationSuccess('Successfully restored backup to test environment'))
        }catch (e) {
            dispatch(new NotificationError('Failed to restore backup to test environment'))
        }finally {
            setRestoreToTestFlagsArray(prevState => Array(backupTimestamps.length).fill(false))
        }
    }
    const handleRestoreToProduction = async (timestamp: number, index: number) => {
        console.log(`inside handleRestoreToProduction: timestamp ${timestamp} index ${index}`)
        setRestoreToProductionFlagForSpecificIndex(index)
        try{
            await wait();
            dispatch(new NotificationSuccess('Successfully restored backup to production environment'))
        }catch (e) {
            dispatch(new NotificationError('Failed to restore backup to production environment'))
        }finally {
            setRestoreToProductionFlagsArray(prevState => Array(backupTimestamps.length).fill(false))
        }
    }
    const handleCreateBackup = async () => {
        console.log(`inside handleCreateBackup`)
        setCreateNewBackupLoaderFlag(prevState => true)
        try{
            await wait();
            setBackupTimestamps(prevState => {
                return [new Date().getTime() ,...prevState]
            })
            dispatch(new NotificationSuccess('Successfully created backup'))
        }catch (e) {
            dispatch(new NotificationError('Failed to create backup'))
        }finally {
            setCreateNewBackupLoaderFlag(prevState => false)
        }
    }
    const handleTrimBackups = async () => {
        console.log(`inside handleTrimBackups`)
        setTrimBackupsLoaderFlag(prevState => true)
        try{
            await wait();
            setBackupTimestamps(prevState => {
                return prevState.slice(0,3)
            })
            dispatch(new NotificationSuccess('Successfully trimmed backups'))
        }catch (e) {
            dispatch(new NotificationError('Failed to trim backups'))
        }finally {
            setTrimBackupsLoaderFlag(prevState => false)
        }
    }

    const backupLoaderComponent = <MySkeleton loading={true}>
        <BackupCard
            index={0}
            onDelete={()=>{}}
            onRestoreToProduction={()=>{}}
            onRestoreToTest={()=>{}}
            timestamp={0}
            deleteLoader={deleteLoaderFlagsArray[0]}
            restoreToProductionLoader={restoreToProductionFlagsArray[0]}
            restoreToTestLoader={restoreToTestFlagsArray[0]}
        />
    </MySkeleton>

    const backupLoadErrorComponent = <p>Error in loading backups. Make sure that the backup and restore server is active in localhost.</p>

    const backupListComponent =
        <React.Fragment>
            <Typography variant={'subtitle1'} sx={{margin: '5px'}}>
                Latest Backup
            </Typography>
            <BackupCard
                index={0}
                timestamp={backupTimestamps[0]}
                onDelete={handleBackupDelete}
                onRestoreToTest={handleRestoreToTest}
                onRestoreToProduction={handleRestoreToProduction}
                deleteLoader={deleteLoaderFlagsArray[0]}
                restoreToProductionLoader={restoreToProductionFlagsArray[0]}
                restoreToTestLoader={restoreToTestFlagsArray[0]}
            />
            <Typography variant={'subtitle1'} sx={{margin: '5px'}}>
                All Backups
            </Typography>
            {backupTimestamps.map((timestamp: number, index: number)=>
                <BackupCard
                    key={timestamp}
                    index={index}
                    timestamp={timestamp}
                    onDelete={handleBackupDelete}
                    onRestoreToTest={handleRestoreToTest}
                    onRestoreToProduction={handleRestoreToProduction}
                    deleteLoader={deleteLoaderFlagsArray[index]}
                    restoreToProductionLoader={restoreToProductionFlagsArray[index]}
                    restoreToTestLoader={restoreToTestFlagsArray[index]}
                />
            )}
        </React.Fragment>

    const backupListEmptyComponent = <p>No Backup found</p>

    let loadedComponent: JSX.Element[]| JSX.Element

    if(backupTimestampsLoaderFlag){
        loadedComponent = backupLoaderComponent
    }else if(backupTimestampsErrorFlag){
        loadedComponent = backupLoadErrorComponent
    }else if(backupTimestamps.length === 0){
        loadedComponent = backupListEmptyComponent
    }else {
        loadedComponent = backupListComponent
    }

    return (
        <Fragment>
            <MyMainCard title="Manage All Backups of Database">
                <MyButton
                    loading={createNewBackupLoaderFlag}
                    text={'Create New Backup'}
                    color={'primary'}
                    onClick={handleCreateBackup}
                />
                <MyButton
                    loading={trimBackupsLoaderFlag}
                    text={'Trim Backups'}
                    color={'warning'}
                    onClick={handleTrimBackups}
                />
            </MyMainCard>
            <MyMainCard title="List of All Backups">
                {loadedComponent}
            </MyMainCard>
        </Fragment>
    )
};

export default BackupRestore;
