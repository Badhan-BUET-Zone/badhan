import useDebounce from "../../hooks/useDebounce";

// project imports
import MyTextField from "../../ui-component/MyTextField";
import React, {useEffect, useState} from "react";
import MyButton from "../../ui-component/MyButton";
import MyMainCard from "../../ui-component/cards/MyMainCard";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notification/notificationModel";
import MySkeleton from "../../ui-component/MySkeleton";
import FadeAnimationWrapper from "../../ui-component/motion/FadeAnimationWrapper";
import {Box} from "@mui/material";
import styleClasses from './Version.module.css'
import useValidate from "../../hooks/useValidate";
import {Fragment} from "react";
import {handleGETLogVersion, handlePATCHFrontendSettings} from "../../api";

const validateNumber = (arg: any): boolean | string => {
    return (isNaN(arg) || !Number.isInteger(Number(arg)) || Number(arg) < 0 || Number(arg) > 100) ? 'Input must be an integer between 1 and 99' : false
}

const Version: React.FC = () => {
    // STATE MANAGEMENT
    const majorVersion = useValidate<string>('', validateNumber)
    const minorVersion = useValidate<string>('', validateNumber)
    const patchVersion = useValidate<string>('', validateNumber)

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

    useEffect(() => {
            const fetchData = async () => {
                setVersionLoadingFlag(prevState => true)
                const response = await handleGETLogVersion()
                setVersionLoadingFlag(prevState => false)
                if (response.status !== 200) {
                    dispatch(new NotificationError('Could not load app version'))
                    setVersionLoadingErrorFlag(prevState => true)
                    return
                }
                const [fetchedMajorVersion, fetchedMinorVersion, fetchedPatchVersion] = response.data.firebaseVersion.split('.')
                majorVersion.setValue(fetchedMajorVersion)
                minorVersion.setValue(fetchedMinorVersion)
                patchVersion.setValue(fetchedPatchVersion)
            }
            fetchData()
        },
        // eslint-disable-next-line
        [dispatch]
    );


    const onSubmitVersion = async () => {
        touchAllValidation()
        if (formHasError()) return

        setVersionSubmitFlag(prevState => true)
        const response = await handlePATCHFrontendSettings({
            majorVersion: parseInt(majorVersion.value),
            minorVersion: parseInt(minorVersion.value),
            patchVersion: parseInt(patchVersion.value)
        })
        setVersionSubmitFlag(prevState => false)
        if (response.status !== 200) {
            dispatch(new NotificationError('Version updated unsuccessful'));
            return
        }
        dispatch(new NotificationSuccess('Updated version successfully'));
    }

    // CONDITIONAL RENDERING
    const versionPageComponent = <FadeAnimationWrapper>
        <p>
            WARNING: Make sure to consult with Mir Mahathir Mohammad to edit the values
        </p>
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
            type={'number'}
            value={minorVersion.value}
            onChange={changeMinorVersionHandler}
        />
        <MyTextField
            helperText={patchVersion.message}
            onBlur={patchVersion.touch}
            error={patchVersion.hasError}
            label="Patch Version"
            type={'number'}
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

    if (versionLoadingFlag) {
        versionPageContent = versionPageLoader
    } else if (versionLoadingErrorFlag) {
        versionPageContent = versionErrorComponent
    } else {
        versionPageContent = versionPageComponent
    }

    // MAIN RENDERING
    return (
        <Fragment>
            <MyMainCard title="Set the App Version Deployed on Google Play">
                {versionPageContent}
            </MyMainCard>
        </Fragment>
    )
};

export default Version;
