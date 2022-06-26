import {Button} from "@mui/material";
import React from "react";
import {CircularProgress} from "@mui/material";

const MyButton: React.FC<{text: string, color: 'primary'|'warning'|'error', onClick: (()=> void), loading?: boolean, disabled?:boolean}> = (props) => (
    <Button sx={{margin: '10px'}} variant="outlined" color={props.color} onClick={props.onClick} disabled={props.loading || props.disabled}>
        {props.loading && <CircularProgress/>}
        {props.text}
    </Button>
)

MyButton.defaultProps = {
    color: 'primary',
    loading: false,
    disabled: false,
}

export default MyButton
