// project imports
import TextField from '@mui/material/TextField'
// ==============================|| SAMPLE PAGE ||============================== //
import {ChangeEvent} from "react"
import styles from './MyTextField.module.css'

const MyTextField = ({id=String(Math.random()), label='Unknown', value='Unknown', onChange=()=>{}}: {id?: string, label?: string, value?: string, onChange?: (text: string)=>void}) => {
    const setTextValue = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value)
    }

    return (<TextField className={styles.textField} id={id} label={label} variant="outlined" value={value} onChange={setTextValue}/>)
};

export default MyTextField;
