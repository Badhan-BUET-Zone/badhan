import React from 'react'
import {Skeleton} from "@mui/material";

const MySkeleton: React.FC<{children: JSX.Element[], loading: boolean}> = (props)=>{
    let content = <React.Fragment>{props.children}</React.Fragment>
    if(props.loading){
        content = <Skeleton sx={{borderRadius: '24px'}} variant="rectangular">
                {props.children}
        </Skeleton>
    }
    return content
}

export default MySkeleton
