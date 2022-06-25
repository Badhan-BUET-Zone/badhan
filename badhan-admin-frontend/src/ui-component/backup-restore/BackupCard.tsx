import {Card, CardContent, Typography} from "@mui/material";
import MyButton from "../MyButton";
import React from "react";

export const BackupCard = (props: {
    index: number,
    timestamp: number,
    onRestoreToTest: (timestamp: number, index:number)=> void,
    onRestoreToProduction: (timestamp: number, index:number)=> void,
    onDelete: (timestamp: number, index:number)=>void,
    deleteLoader: boolean,
    restoreToTestLoader: boolean,
    restoreToProductionLoader: boolean,
}) => {
    const handleDelete = () =>{
        props.onDelete(props.timestamp, props.index)
    }
    const handleRestoreToTest = () => {
        props.onRestoreToTest(props.timestamp, props.index)
    }
    const handleRestoreToProduction = () =>{
        props.onRestoreToProduction(props.timestamp, props.index)
    }
    return (
        <Card variant="outlined" sx={{maxWidth: '600px', margin: '10px'}}>
            <CardContent>
                <Typography variant={'h5'} sx={{'padding':'10px'}}>Time: {new Date(props.timestamp).toLocaleString()}</Typography>
                <MyButton loading={props.restoreToTestLoader} text={'Restore to Test'} color={'primary'} onClick={handleRestoreToTest}/>
                <MyButton loading={props.restoreToProductionLoader} text={'Restore to Production'} color={'warning'} onClick={handleRestoreToProduction}/>
                <MyButton loading={props.deleteLoader} text={'Delete'} color={'warning'} onClick={handleDelete}/>
            </CardContent>
        </Card>
    )
}
