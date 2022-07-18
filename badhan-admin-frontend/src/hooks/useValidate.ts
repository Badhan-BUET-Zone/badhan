import {useState} from "react";

interface ValidationClass<Type>{
    value: Type
    hasError: boolean
    message: boolean | string
    isTouched: boolean
}
const useValidate = <Type>(initialValue: Type, validator: (argument: Type)=> boolean | string) => {
    const [validationObject, setValidation ] = useState<ValidationClass<Type>>({value: initialValue, hasError: false, message: false, isTouched: false})

    const setValue = (newValue: Type) => {
        try{
            const validationErrorMessage = validator(newValue)
            setValidation((prevState: ValidationClass<Type>)=>({
                value: newValue,
                hasError: prevState.isTouched && !!validationErrorMessage,
                message: validationErrorMessage,
                isTouched: prevState.isTouched
            }))
        }catch (e) {
            console.log('error')
        }
    }
    const touch = () => {
        setValidation((prevState: ValidationClass<Type>)=>({
            value: prevState.value,
            hasError: !!prevState.message,
            message: prevState.message,
            isTouched: true
        }))
    }
    const reset = () => {
        setValidation((prevState: ValidationClass<Type>)=>({
            value: initialValue,
            hasError: false,
            message: false,
            isTouched: false
        }))
    }
    return {value: validationObject.value, setValue, reset, touch, isTouched: validationObject.isTouched, message: validationObject.message, hasError: validationObject.hasError}
}

export default useValidate
