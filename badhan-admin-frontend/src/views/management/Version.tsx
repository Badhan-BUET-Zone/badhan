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
    const {
        value:majorVersion,
        setTouch: setMajorVersionTouch,
        setValue: setMajorVersion,
        isError: isMajorVersionError,
        message: majorVersionValidationMessage,
    } = useValidate<string>('',validateNumber)

    const {
        value:minorVersion,
        setTouch: setMinorVersionTouch,
        setValue:setMinorVersion,
        isError: isMinorVersionError,
        message: minorVersionValidationMessage,
    } = useValidate<string>('',validateNumber)

    const {
        value:patchVersion,
        setTouch: setPatchVersionTouch,
        setValue:setPatchVersion,
        isError: isPatchVersionError,
        message: patchVersionValidationMessage,
    } = useValidate<string>('',validateNumber)

    const [versionSubmitFlag, setVersionSubmitFlag] = useState<boolean>(false)
    const [versionLoadingFlag, setVersionLoadingFlag] = useState<boolean>(true)
    const [versionLoadingErrorFlag, setVersionLoadingErrorFlag] = useState<boolean>(false)
    const dispatch = useDispatch();

    const debouncePrint = () => {
        console.log("Debounced print")
    }

    const debounceHandler = useDebounce(debouncePrint)

    const changeMajorVersionHandler = (text: string) => {
        setMajorVersion(text)
        debounceHandler()
    }

    const changeMinorVersionHandler = (text: string) => {
        setMinorVersion(text)
    }
    const changePatchVersionHandler = (text: string) => {
        setPatchVersion(text)
    }

    // HANDLERS
    useEffect(  () => {
        const fetchData = async()=>{
            setVersionLoadingFlag(prevState => true)
            try{
                await wait();
                setMajorVersion('9')
                setMinorVersion('5')
                setPatchVersion('2')
            }catch (e) {
                dispatch(new NotificationError('Could not load app version'))
                setVersionLoadingErrorFlag(prevState => true)
            }finally {
                setVersionLoadingFlag(prevState => false)
            }
        }
        fetchData()
    },[dispatch]);

    const onSubmitVersion = async () =>{
        const versionSubmissionData = `${majorVersion}.${minorVersion}.${patchVersion}`
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
            helperText={majorVersionValidationMessage}
            onBlur={setMajorVersionTouch}
            error={isMajorVersionError}
            label="Major Version"
            value={majorVersion}
            onChange={changeMajorVersionHandler}
        />
        <MyTextField
            helperText={minorVersionValidationMessage}
            onBlur={setMinorVersionTouch}
            error={isMinorVersionError}
            label="Minor Version"
            value={minorVersion}
            onChange={changeMinorVersionHandler}
        />
        <MyTextField
            helperText={patchVersionValidationMessage}
            onBlur={setPatchVersionTouch}
            error={isPatchVersionError}
            label="Patch Version"
            value={patchVersion}
            onChange={changePatchVersionHandler}
        />
        <br/>
        <MyButton loading={versionSubmitFlag} color={'primary'} text={'Update Version'} onClick={onSubmitVersion}/>
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
