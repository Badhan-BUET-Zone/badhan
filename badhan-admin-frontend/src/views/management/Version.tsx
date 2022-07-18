import useDebounce from "../../hooks/useDebounce";

// project imports
import MyTextField from "../../ui-component/MyTextField";
import React, {useEffect, useState} from "react";
import MyButton from "../../ui-component/MyButton";
import MyMainCard from "../../ui-component/cards/MyMainCard";
import {wait} from "../../utils/dummyAPI";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notificationModel";
import MySkeleton from "../../ui-component/MySkeleton";
import FadeAnimationWrapper from "../../ui-component/motion/FadeAnimationWrapper";
import {Box} from "@mui/material";
import styleClasses from './Version.module.css'
import useValidate from "../../hooks/useValidate";

const validateNumber = (arg:any): boolean |string => {
    return (isNaN(arg) || !Number.isInteger(Number(arg)) || Number(arg) <0 || Number(arg)>100)?'Input must be an integer between 1 and 99':false
}

const Version: React.FC = () => {
    // STATE MANAGEMENT
    const majorVersion = useValidate<string>('',validateNumber)
    const minorVersion = useValidate<string>('',validateNumber)
    const patchVersion = useValidate<string>('',validateNumber)

    const [versionSubmitFlag, setVersionSubmitFlag] = useState<boolean>(false)
    const [versionLoadingFlag, setVersionLoadingFlag] = useState<boolean>(true)
    const [versionLoadingErrorFlag, setVersionLoadingErrorFlag] = useState<boolean>(false)
    const dispatch = useDispatch();

    // HANDLERS

    const touchAllValidation = () => {
        patchVersion.touch()
        minorVersion.touch()
        majorVersion.touch()
    }

    const formHasError = () => {
        return minorVersion.hasError || majorVersion.hasError || patchVersion.hasError
    }

    const debouncePrint = () => {
        console.log("Debounced print")
    }

    const debounceHandler = useDebounce(debouncePrint)

    const changeMajorVersionHandler = (text: string) => {
        majorVersion.setValue(text)
        debounceHandler()
    }

    const changeMinorVersionHandler = (text: string) => {
        minorVersion.setValue(text)
    }
    const changePatchVersionHandler = (text: string) => {
        patchVersion.setValue(text)
    }

    useEffect(  () => {
        const fetchData = async()=>{
            setVersionLoadingFlag(prevState => true)
            try{
                await wait();
                majorVersion.setValue('9')
                minorVersion.setValue('5')
                patchVersion.setValue('2')
            }catch (e) {
                dispatch(new NotificationError('Could not load app version'))
                setVersionLoadingErrorFlag(prevState => true)
            }finally {
                setVersionLoadingFlag(prevState => false)
            }
        }
        fetchData()
    },
        // eslint-disable-next-line
        [dispatch]);


    const onSubmitVersion = async () =>{
        touchAllValidation()
        if(formHasError())return

        const versionSubmissionData = `${majorVersion.value}.${minorVersion}.${patchVersion}`
        setVersionSubmitFlag(prevState => true)
        try{
            await wait();
            dispatch(new NotificationSuccess('Updated version successfully'));
            console.log(versionSubmissionData)
        }catch (e) {
            dispatch(new NotificationError('Version updated unsuccessful'));
        }finally {
            setVersionSubmitFlag(prevState => false)
        }
    }

    // CONDITIONAL RENDERING
    const versionPageComponent = <FadeAnimationWrapper>
        <MyTextField
            helperText={majorVersion.message}
            onBlur={majorVersion.touch}
            error={majorVersion.hasError}
            label="Major Version"
            value={majorVersion.value}
            onChange={changeMajorVersionHandler}
        />
        <MyTextField
            helperText={minorVersion.message}
            onBlur={minorVersion.touch}
            error={minorVersion.hasError}
            label="Minor Version"
            value={minorVersion.value}
            onChange={changeMinorVersionHandler}
        />
        <MyTextField
            helperText={patchVersion.message}
            onBlur={patchVersion.touch}
            error={patchVersion.hasError}
            label="Patch Version"
            value={patchVersion.value}
            onChange={changePatchVersionHandler}
        />
        <br/>
        <MyButton
            disabled={formHasError()}
            loading={versionSubmitFlag}
            color={'primary'}
            text={'Update Version'}
            onClick={onSubmitVersion}
        />
    </FadeAnimationWrapper>

    const versionPageLoader = <MySkeleton loading={true}><Box className={styleClasses.box}>Loading</Box></MySkeleton>

    const versionErrorComponent = <React.Fragment>
        Could not load app version
    </React.Fragment>

    let versionPageContent: JSX.Element

    if(versionLoadingFlag){
        versionPageContent = versionPageLoader
    }
    else if(versionLoadingErrorFlag){
        versionPageContent = versionErrorComponent
    }else{
        versionPageContent = versionPageComponent
    }

    // MAIN RENDERING
    return (<MyMainCard title="Set the App Version Deployed on Google Play">
        {versionPageContent}
    </MyMainCard>)
};

export default Version;
