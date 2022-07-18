import {useState} from "react";

interface ValidationClass<Type>{
    value: Type
    isError: boolean
    message: boolean | string
    isTouched: boolean
}
const useValidate = <Type>(initialValue: Type, validator: (argument: Type)=> boolean | string) => {
    const [validationObject, setValidation ] = useState<ValidationClass<Type>>({value: initialValue, isError: false, message: false, isTouched: false})

    const setValue = (newValue: Type) => {
        try{
            const validationErrorMessage = validator(newValue)
            setValidation((prevState: ValidationClass<Type>)=>({
                value: newValue,
                isError: prevState.isTouched && !!validationErrorMessage,
                message: validationErrorMessage,
                isTouched: prevState.isTouched
            }))
        }catch (e) {
            console.log('error')
        }
    }
    const setTouch = () => {
        setValidation((prevState: ValidationClass<Type>)=>({
            value: prevState.value,
            isError: !!prevState.message,
            message: prevState.message,
            isTouched: true
        }))
    }
    const resetValue = () => {
        setValidation((prevState: ValidationClass<Type>)=>({
            value: initialValue,
            isError: false,
            message: false,
            isTouched: false
        }))
    }
    return {value: validationObject.value, setValue, resetValue, setTouch, isTouched: validationObject.isTouched, message: validationObject.message, isError: validationObject.isError}
}

export default useValidate
