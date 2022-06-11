import {Button} from "@mui/material";
import React from "react";

const MyButton: React.FC<{text: string, color: 'primary'|'warning'}> = (props) => (
    <Button variant="contained" color={props.color}>{props.text}</Button>
)

export default MyButton
