import {Card, CardActions, CardContent, CardHeader, Divider} from "@mui/material";
import React from 'react';
import styles from './MyMainCard.module.css'
const MyMainCard: React.FC<{ title: string, children: JSX.Element[] | JSX.Element, cardActions?: JSX.Element[] | JSX.Element }> = (props) => {
    return (
        <Card className={styles.myMainCard}>
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
