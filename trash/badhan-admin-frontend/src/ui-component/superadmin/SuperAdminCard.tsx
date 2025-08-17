import {Card, CardContent, Typography} from "@mui/material";
import MyButton from "../MyButton";
import styles from './SuperAdminCard.module.css'
import FadeAnimationWrapper from "../motion/FadeAnimationWrapper";
import {useDispatch} from "react-redux";
import {ConfirmationDialogOpen} from "../../store/confirmationDialog/model";

export const SuperAdminCard = (props: {
    id: string,
    name: string,
    phone: string,
    hall: string,
    onDeleteHandler: (id: string, index: number) => void,
    deleteFlag: boolean,
    index: number
}) => {
    const dispatch = useDispatch()

    const deleteHandler = () => {
        props.onDeleteHandler(props.id, props.index)
    }
    const promptDelete = () => {
        dispatch(new ConfirmationDialogOpen('Are you sure you want to delete this super admin?', deleteHandler))
    }
    return (
        <FadeAnimationWrapper>
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
                    </Typography>
                    <MyButton text={'Delete'} color={'warning'} onClick={promptDelete} loading={props.deleteFlag}/>
                </CardContent>
            </Card>
        </FadeAnimationWrapper>
    )
}
