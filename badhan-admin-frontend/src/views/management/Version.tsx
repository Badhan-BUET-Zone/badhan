// @ts-nocheck
// material-ui

// project imports
import MainCard from '../../ui-component/cards/MainCard';
import MyTextField from "../../ui-component/MyTextField";
import React from "react";
import MyButton from "../../ui-component/MyButton";
// ==============================|| SAMPLE PAGE ||============================== //

const cardAction = <MyButton text={'Update Version'}/>

const Version: React.FC = () => (
    <MainCard title="Set the App Version Deployed on Google Play" cardAction={cardAction}>
            <MyTextField id="major-version" label="Major Version"/>
            <MyTextField id="minor-version" label="Minor Version"/>
            <MyTextField id="patch-version" label="Patch Version"/>
    </MainCard>
);

export default Version;
