import {Card, CardActions, CardContent, CardHeader, Divider} from "@mui/material";
import React from 'react';
const MyMainCard: React.FC<{ title: string, children: JSX.Element[] | JSX.Element, cardActions?: JSX.Element[] | JSX.Element }> = (props) => {
    return (
        <Card sx={{margin: '10px'}}>
            <CardHeader title={props.title}/>
            <Divider/>
            <CardContent>
                {props.children}
            </CardContent>
            {props.cardActions && <CardActions>
                {props.cardActions}
            </CardActions>}
        </Card>
    );
}

export default MyMainCard
