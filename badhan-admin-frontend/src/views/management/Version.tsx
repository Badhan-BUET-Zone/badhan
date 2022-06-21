// material-ui

// project imports
import MyTextField from "../../ui-component/MyTextField";
import React from "react";
import MyButton from "../../ui-component/MyButton";
import MyMainCard from "../../ui-component/cards/MyMainCard";

import {useState} from "react";
import {wait} from "../../utils/dummyAPI";

// const cardAction = <MyButton color={'primary'} text={'Update Version'} onClick={()=>{}}/>

const Version: React.FC = () => {
    const [majorVersion, setMajorVersion] = useState<string>('')
    const [minorVersion, setMinorVersion] = useState<string>('')
    const [patchVersion, setPatchVersion] = useState<string>('')
    const [versionSubmitFlag, setVersionSubmitFlag] = useState<boolean>(false)
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

        await wait()

        setVersionSubmitFlag(prevState => false)
        console.log(versionSubmissionData)

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
