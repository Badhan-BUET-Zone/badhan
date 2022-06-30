import {Card, CardContent, Typography} from "@mui/material";
import MyButton from "../MyButton";
import styles from './SuperAdminCard.module.css'
export const SuperAdminCard = (props:{
    id: string,
    name: string,
    phone: string,
    hall: string,
    bloodGroup: string,
    onDeleteHandler: (id: string, index: number)=> void,
    deleteFlag: boolean,
    index: number
})=>{
    const deleteHandler = ()=>{
        props.onDeleteHandler(props.id, props.index)
    }
    return (
        <Card variant="outlined" className={styles.superAdminCard}>
            <CardContent>
                <Typography className={styles.superAdminCardTitle} color="text.secondary" gutterBottom>
                    Super Admin
                </Typography>
                <Typography variant="h5" component="div">
                    {props.name}
                </Typography>
                <Typography className={styles.superAdminCardPhone} color="text.secondary">
                    {props.phone}
                </Typography>
                <Typography variant="body2">
                    {props.hall} Hall
                    <br/>
                    Blood Group: {props.bloodGroup}
                </Typography>
                <MyButton text={'Delete'} color={'warning'} onClick={deleteHandler} loading={props.deleteFlag}/>
            </CardContent>
        </Card>
    )
}
