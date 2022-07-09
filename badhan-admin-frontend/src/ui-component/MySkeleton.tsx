import React from 'react'
import {Skeleton} from "@mui/material";
import styles from './MySkeleton.module.css'

const MySkeleton: React.FC<{children: JSX.Element[] | JSX.Element, loading: boolean, className?: string}> = (props)=>{
    let content = <>{props.children}</>
    if(props.loading){
        content = <Skeleton className={`${props.className} ${styles.skeletonLoader}`} variant="rectangular">
                {props.children}
        </Skeleton>
    }
    return content
}

export default MySkeleton
