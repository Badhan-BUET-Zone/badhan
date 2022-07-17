import {useState} from "react";

interface ValidationClass<Type>{
    value: Type
    isError: boolean
    isInvalid: boolean
    isTouched: boolean
}
const useValidate = <Type>(initialValue: Type, validator: (argument: Type)=> boolean) => {
    const [validationObject, setValidation ] = useState<ValidationClass<Type>>({value: initialValue, isError: false, isInvalid: false, isTouched: false})

    const setValue = (newValue: Type) => {
        try{
            const isNewValueValid = validator(newValue)
            setValidation((prevState: ValidationClass<Type>)=>({
                value: newValue,
                isError: prevState.isTouched && !isNewValueValid,
                isInvalid: !isNewValueValid,
                isTouched: prevState.isTouched
            }))
        }catch (e) {
            console.log('error')
        }
    }
    const setTouch = () => {
        setValidation((prevState: ValidationClass<Type>)=>({
            value: prevState.value,
            isError: prevState.isInvalid,
            isInvalid: prevState.isInvalid,
            isTouched: true
        }))
    }
    const resetValue = () => {
        setValidation((prevState: ValidationClass<Type>)=>({
            value: initialValue,
            isError: false,
            isInvalid: false,
            isTouched: false
        }))
    }
    return {value: validationObject.value, setValue, resetValue, setTouch, isTouched: validationObject.isTouched, isInvalid: validationObject.isInvalid, isError: validationObject.isError}
}

export default useValidate
