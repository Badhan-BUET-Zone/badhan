import {Button} from "@mui/material";
import React from "react";

const MyButton: React.FC<{text: string, color: 'primary'|'warning'|'error', onClick: (()=> void)}> = (props) => (
    <Button sx={{margin: '10px'}} variant="contained" color={props.color} onClick={props.onClick}>{props.text}</Button>
)

export default MyButton
