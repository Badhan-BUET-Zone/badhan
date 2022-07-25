import {Card, CardContent, Typography} from "@mui/material";
import MyButton from "../MyButton";
import React from "react";
import styles from './BackupCard.module.css'
import FadeAnimationWrapper from "../motion/FadeAnimationWrapper";
import {useDispatch} from "react-redux";
import {ConfirmationDialogOpen} from "../../store/confirmationDialog/model";

export const BackupCard = (props: {
    index: number,
    timestamp: number,
    onRestoreToTest: (timestamp: number, index: number) => void,
    onRestoreToProduction: (timestamp: number, index: number) => void,
    onDelete: (timestamp: number, index: number) => void,
    deleteLoader: boolean,
    restoreToTestLoader: boolean,
    restoreToProductionLoader: boolean,
}) => {
    const dispatch = useDispatch()

    const handleDelete = () => {
        props.onDelete(props.timestamp, props.index)
    }
    const promptConfirmation = () => {
        dispatch(new ConfirmationDialogOpen('Delete this backup?', handleDelete))
    }
    const handleRestoreToTest = () => {
        props.onRestoreToTest(props.timestamp, props.index)
    }
    const handleRestoreToProduction = () => {
        props.onRestoreToProduction(props.timestamp, props.index)
    }
    return (
        <FadeAnimationWrapper>
            <Card variant="outlined" className={styles.backupCard}>
                <CardContent>
                    <Typography variant={'h5'}
                                className={styles.backupCardTitle}>Time: {new Date(props.timestamp).toLocaleString()}</Typography>
                    <MyButton loading={props.restoreToTestLoader} text={'Restore to Test'} color={'primary'}
                              onClick={handleRestoreToTest}/>
                    <MyButton loading={props.restoreToProductionLoader} text={'Restore to Production'} color={'warning'}
                              onClick={handleRestoreToProduction}/>
                    <MyButton loading={props.deleteLoader} text={'Delete'} color={'warning'} onClick={promptConfirmation}/>
                </CardContent>
            </Card>
        </FadeAnimationWrapper>
    )
}
