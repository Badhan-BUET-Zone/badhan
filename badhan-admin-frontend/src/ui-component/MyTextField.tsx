// project imports
import TextField from '@mui/material/TextField'
// ==============================|| SAMPLE PAGE ||============================== //

const MyTextField = (props: {id: string, label: string}) => (
    <TextField sx={{margin: 1}} id={props.id} label={props.label} variant="outlined" />
);

export default MyTextField;
