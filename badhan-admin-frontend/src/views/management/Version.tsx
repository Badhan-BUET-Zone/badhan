// material-ui

// project imports
import MyTextField from "../../ui-component/MyTextField";
import React, {useState} from "react";
import MyButton from "../../ui-component/MyButton";
import MyMainCard from "../../ui-component/cards/MyMainCard";
import {wait} from "../../utils/dummyAPI";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notificationModel";

const Version: React.FC = () => {
    const [majorVersion, setMajorVersion] = useState<string>('')
    const [minorVersion, setMinorVersion] = useState<string>('')
    const [patchVersion, setPatchVersion] = useState<string>('')
    const [versionSubmitFlag, setVersionSubmitFlag] = useState<boolean>(false)
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
    return (<MyMainCard title="Set the App Version Deployed on Google Play">
        <MyTextField label="Major Version" value={majorVersion} onChange={changeMajorVersionHandler}/>
        <MyTextField label="Minor Version" value={minorVersion} onChange={changeMinorVersionHandler}/>
        <MyTextField label="Patch Version" value={patchVersion} onChange={changePatchVersionHandler}/>
        <br/>
        <MyButton loading={versionSubmitFlag} color={'primary'} text={'Update Version'} onClick={onSubmitVersion}/>
    </MyMainCard>)
};

export default Version;
