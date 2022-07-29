// material-ui

// project imports
import MyButton from "../../ui-component/MyButton";
import React, {useEffect, useState} from 'react'
import {BackupCard} from "../../ui-component/backup-restore/BackupCard";
import {Grid, Typography} from "@mui/material";
import MyMainCard from "../../ui-component/cards/MyMainCard";
import MySkeleton from "../../ui-component/MySkeleton";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notification/notificationModel";
import styles from './index.module.css'
import FadeAnimationWrapper from "../../ui-component/motion/FadeAnimationWrapper";
import UnderConstructionNotice from "../../ui-component/UnderConstructionNotice";
import {
    handleDELETEBackup,
    handleDELETEBackupOld,
    handleGETBackup,
    handlePOSTBackup,
    handlePOSTRestore,
    handlePOSTRestoreToProduction
} from "../../api";

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

            setBackupTimestampsLoaderFlag(prevState => true)
            const response = await handleGETBackup()
            setBackupTimestampsLoaderFlag(prevState => false)
            if (response.status !== 200) {
                setBackupTimestampsErrorFlag(prevState => true)
                dispatch(new NotificationError('Error in loading backups'))
                return
            }
            const listOfBackups = response.data.backups
            setBackupTimestamps(prevState => listOfBackups)
            setDeleteLoaderFlagsArray(prevState => Array(listOfBackups.length).fill(false))
            setRestoreToProductionFlagsArray(prevState => Array(listOfBackups.length).fill(false))
            setRestoreToTestFlagsArray(prevState => Array(listOfBackups.length).fill(false))
            dispatch(new NotificationSuccess('Successfully loaded backups'))

        }
        loadBackups()
    }, [dispatch])

    const handleBackupDelete = async (timestamp: number, index: number) => {
        console.log(`inside handleBackupDelete: timestamp ${timestamp} index ${index}`)
        setDeleteFlagForSpecificIndex(index)
        const response = await handleDELETEBackup({date: timestamp})
        setDeleteLoaderFlagsArray(prevState => Array(backupTimestamps.length).fill(false))
        if (response.status !== 200) {
            dispatch(new NotificationError('Error in deleting backup'))
            return
        }
        setBackupTimestamps(prevState => {
            return prevState.filter(backup => backup !== timestamp)
        })
        dispatch(new NotificationSuccess('Successfully deleted backup'))
    }
    const handleRestoreToTest = async (timestamp: number, index: number) => {
        console.log(`inside handleRestoreToTest: timestamp ${timestamp} index ${index}`)
        setRestoreToTestFlagForSpecificIndex(index)
        const response = await handlePOSTRestore({date: timestamp})
        setRestoreToTestFlagsArray(prevState => Array(backupTimestamps.length).fill(false))
        if (response.status !== 200) {
            dispatch(new NotificationError('Failed to restore backup to test environment'))
            return
        }
        dispatch(new NotificationSuccess('Successfully restored backup to test environment'))
    }
    const handleRestoreToProduction = async (timestamp: number, index: number) => {
        console.log(`inside handleRestoreToProduction: timestamp ${timestamp} index ${index}`)
        setRestoreToProductionFlagForSpecificIndex(index)
        const response = await handlePOSTRestoreToProduction({date: timestamp});
        setRestoreToProductionFlagsArray(prevState => Array(backupTimestamps.length).fill(false))
        if (response.status !== 200) {
            dispatch(new NotificationError('Failed to restore backup to production environment'))
            return
        }
        dispatch(new NotificationSuccess('Successfully restored backup to production environment'))
    }
    const handleCreateBackup = async () => {
        setCreateNewBackupLoaderFlag(prevState => true)
        const response = await handlePOSTBackup()
        setCreateNewBackupLoaderFlag(prevState => false)
        if (response.status !== 201) {
            dispatch(new NotificationError('Failed to create backup'))
            return
        }
        setBackupTimestamps(prevState => {
            return [new Date().getTime(), ...prevState]
        })
        dispatch(new NotificationSuccess('Successfully created backup'))
    }
    const handleTrimBackups = async () => {
        setTrimBackupsLoaderFlag(prevState => true)
        const response = await handleDELETEBackupOld();
        setTrimBackupsLoaderFlag(prevState => false)
        if (response.status !== 200) {
            dispatch(new NotificationError('Failed to trim backups'))
            return
        }
        setBackupTimestamps(prevState => {
            return prevState.slice(0, 3)
        })
        dispatch(new NotificationSuccess('Successfully trimmed backups'))
    }

    const backupLoaderComponent = <MySkeleton loading={true}>
        <BackupCard
            index={0}
            onDelete={() => {
            }}
            onRestoreToProduction={() => {
            }}
            onRestoreToTest={() => {
            }}
            timestamp={0}
            deleteLoader={deleteLoaderFlagsArray[0]}
            restoreToProductionLoader={restoreToProductionFlagsArray[0]}
            restoreToTestLoader={restoreToTestFlagsArray[0]}
        />
    </MySkeleton>

    const backupLoadErrorComponent = <p>Error in loading backups. Make sure that the backup and restore server is active
        in localhost and reload this page. Please visit <a href={'https://github.com/Badhan-BUET-Zone/badhan-admin-frontend'}>this link</a> on setting up
        the backup api server on localhost</p>

    const backupListComponent =
        <React.Fragment>
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
            <Typography variant={'subtitle1'} className={styles.backupTitle}>
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
            <Typography variant={'subtitle1'} className={styles.backupTitle}>
                All Backups
            </Typography>
            <Grid container>
                {backupTimestamps.map((timestamp: number, index: number) =>
                    <Grid item xs={12} md={4} key={timestamp}>
                        <BackupCard
                            index={index}
                            timestamp={timestamp}
                            onDelete={handleBackupDelete}
                            onRestoreToTest={handleRestoreToTest}
                            onRestoreToProduction={handleRestoreToProduction}
                            deleteLoader={deleteLoaderFlagsArray[index]}
                            restoreToProductionLoader={restoreToProductionFlagsArray[index]}
                            restoreToTestLoader={restoreToTestFlagsArray[index]}
                        />
                    </Grid>
                )}
            </Grid>
        </React.Fragment>

    const backupListEmptyComponent = <p>No Backup found</p>

    let loadedComponent: JSX.Element[] | JSX.Element

    if (backupTimestampsLoaderFlag) {
        loadedComponent = backupLoaderComponent
    } else if (backupTimestampsErrorFlag) {
        loadedComponent = backupLoadErrorComponent
    } else if (backupTimestamps.length === 0) {
        loadedComponent = backupListEmptyComponent
    } else {
        loadedComponent = backupListComponent
    }

    return (
        <FadeAnimationWrapper>
            <UnderConstructionNotice/>
            <MyMainCard title="Manage All Backups of Database">
                {loadedComponent}
            </MyMainCard>
        </FadeAnimationWrapper>
    )
};

export default BackupRestore;
