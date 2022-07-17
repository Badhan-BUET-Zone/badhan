// project imports
import TextField from '@mui/material/TextField'
// ==============================|| SAMPLE PAGE ||============================== //
import {ChangeEvent, ForwardedRef} from "react"
import styles from './MyTextField.module.css'
import { forwardRef } from 'react'

import {generateRandomId} from '../utils'

const textType = 'text'
const numberType = 'number'
type textFieldType = typeof textType | typeof numberType

const MyTextField = forwardRef(({onBlur=()=>{},helperText=false,error=false, name=generateRandomId(), id=generateRandomId(), label=generateRandomId(), value='Unknown', onChange=()=>{}, type='text'}: {onBlur?: ()=>void, helperText?: string | boolean, error?: boolean, name?: string, id?: string, label?: string, value?: string, onChange?: (text: string)=>void, type?: textFieldType}, ref?: ForwardedRef<HTMLInputElement>) => {
    const setTextValue = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value)
    }

    return (<TextField onBlur={onBlur} helperText={helperText} error={error} name={name} type={type} inputRef={ref} className={styles.textField} id={id} label={label} variant="outlined" value={value} onChange={setTextValue}/>)
});

export default MyTextField;
