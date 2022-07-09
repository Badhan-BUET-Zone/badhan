// project imports
import TextField from '@mui/material/TextField'
// ==============================|| SAMPLE PAGE ||============================== //
import {ChangeEvent, ForwardedRef} from "react"
import styles from './MyTextField.module.css'
import { forwardRef } from 'react'

const textType = 'text'
const numberType = 'number'
type textFieldType = typeof textType | typeof numberType

const MyTextField = forwardRef(({id=String(Math.random()), label='Unknown', value='Unknown', onChange=()=>{}, type='text'}: {id?: string, label?: string, value?: string, onChange?: (text: string)=>void, type?: textFieldType}, ref?: ForwardedRef<HTMLInputElement>) => {
    const setTextValue = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value)
    }

    return (<TextField type={type} inputRef={ref} className={styles.textField} id={id} label={label} variant="outlined" value={value} onChange={setTextValue}/>)
});

export default MyTextField;
