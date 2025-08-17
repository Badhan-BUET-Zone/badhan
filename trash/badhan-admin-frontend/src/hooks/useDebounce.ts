import React from "react";
import {debounce} from "lodash";

const useDebounce = (callback: ()=> void) => {
    return React.useRef(
        debounce(callback, 1000)
    ).current
}

export default useDebounce
