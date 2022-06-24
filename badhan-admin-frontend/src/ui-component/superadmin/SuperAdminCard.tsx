import {Card, CardActions, CardContent, Typography} from "@mui/material";
import MyButton from "../MyButton";

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
        <Card variant="outlined" sx={{ maxWidth: 275, margin: '10px' }}>
            <CardContent>
                <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                    Super Admin
                </Typography>
                <Typography variant="h5" component="div">
                    {props.name}
                </Typography>
                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    {props.phone}
                </Typography>
                <Typography variant="body2">
                    {props.hall} Hall
                    <br />
                    Blood Group: {props.bloodGroup}
                </Typography>
            </CardContent>
            <CardActions>
                <MyButton text={'Delete'} color={'warning'} onClick={deleteHandler} loading={props.deleteFlag}/>
            </CardActions>
        </Card>
    )
}
