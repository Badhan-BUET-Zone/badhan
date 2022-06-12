import {Card, CardContent, Typography} from "@mui/material";
import MyButton from "../MyButton";
import React from "react";

export const BackupCard = () => {
    return (
        <Card variant="outlined" sx={{maxWidth: '500px', margin: '10px'}}>
            <CardContent>
                <Typography variant={'h5'} sx={{'padding':'10px'}}>26 June 2022, 12:26 PM</Typography>
                <MyButton text={'Restore to Test'} color={'primary'}/>
                <MyButton text={'Restore to Test'} color={'warning'}/>
                <MyButton text={'Delete'} color={'warning'}/>
            </CardContent>
        </Card>
    )
}
