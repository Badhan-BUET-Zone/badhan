import React from 'react';
import {motion} from 'framer-motion'

const FadeAnimationWrapper: React.FC<{ children: JSX.Element[] | JSX.Element }> = (props) => {
    return (
        <motion.span initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}>
            {props.children}
        </motion.span>
    );
}
export default FadeAnimationWrapper
