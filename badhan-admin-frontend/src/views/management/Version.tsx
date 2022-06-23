// material-ui

// project imports
import MyTextField from "../../ui-component/MyTextField";
import React, {useState, useEffect} from "react";
import MyButton from "../../ui-component/MyButton";
import MyMainCard from "../../ui-component/cards/MyMainCard";
import {wait} from "../../utils/dummyAPI";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notificationModel";
import MySkeleton from "../../ui-component/MySkeleton";

const Version: React.FC = () => {
    const [majorVersion, setMajorVersion] = useState<string>('')
    const [minorVersion, setMinorVersion] = useState<string>('')
    const [patchVersion, setPatchVersion] = useState<string>('')
    const [versionSubmitFlag, setVersionSubmitFlag] = useState<boolean>(false)
    const [versionLoadingFlag, setVersionLoadingFlag] = useState<boolean>(true)
    const [versionLoadingErrorFlag, setVersionLoadingErrorFlag] = useState<boolean>(false)
    const dispatch = useDispatch();
    const changeMajorVersionHandler = (text: string) => {
        setMajorVersion((prevText:string)=>text)
    }
    const changeMinorVersionHandler = (text: string) => {
        setMinorVersion((prevText:string)=>text)
    }
    const changePatchVersionHandler = (text: string) => {
        setPatchVersion((prevText:string)=>text)
    }

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

    let versionPageContent = <MySkeleton loading={versionLoadingFlag}>
        <MyTextField label="Major Version" value={majorVersion} onChange={changeMajorVersionHandler}/>
        <MyTextField label="Minor Version" value={minorVersion} onChange={changeMinorVersionHandler}/>
        <MyTextField label="Patch Version" value={patchVersion} onChange={changePatchVersionHandler}/>
        <br/>
        <MyButton loading={versionSubmitFlag} color={'primary'} text={'Update Version'} onClick={onSubmitVersion}/>
    </MySkeleton>

    if(versionLoadingErrorFlag){
        versionPageContent = <React.Fragment>
            Could not load app version
        </React.Fragment>
    }

    return (<MyMainCard title="Set the App Version Deployed on Google Play">
        {versionPageContent}
    </MyMainCard>)
};

export default Version;
