// material-ui

// project imports
import MyTextField from "../../ui-component/MyTextField";
import React from "react";
import MyButton from "../../ui-component/MyButton";
import MyMainCard from "../../ui-component/cards/MyMainCard";
// ==============================|| SAMPLE PAGE ||============================== //

const cardAction = <MyButton color={'primary'} text={'Update Version'} onClick={()=>{}}/>

const Version: React.FC = () => (
    <MyMainCard title="Set the App Version Deployed on Google Play" cardActions={cardAction}>
            <MyTextField id="major-version" label="Major Version"/>
            <MyTextField id="minor-version" label="Minor Version"/>
            <MyTextField id="patch-version" label="Patch Version"/>
    </MyMainCard>
);

export default Version;
