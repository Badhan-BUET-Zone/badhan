// @ts-nocheck
// material-ui


// project imports
import MainCard from '../../ui-component/cards/MainCard';
import {SuperAdminCard} from "../../ui-component/superadmin/SuperAdminCard";
import React from 'react'
import MyTextField from "../../ui-component/MyTextField";
import MyButton from "../../ui-component/MyButton";

// ==============================|| SAMPLE PAGE ||============================== //

const SuperAdmin = () => (
    <React.Fragment>
    <MainCard title="List of Super Admins">
        <SuperAdminCard name={'Mir Mahathir Mohammad'} phone={'8801521438557'} hall={'Suhrawardi'} bloodGroup={'B+'}/>
        <SuperAdminCard name={'Mir Mahathir Mohammad'} phone={'8801521438557'} hall={'Suhrawardi'} bloodGroup={'B+'}/>
        <SuperAdminCard name={'Mir Mahathir Mohammad'} phone={'8801521438557'} hall={'Suhrawardi'} bloodGroup={'B+'}/>
        <SuperAdminCard name={'Mir Mahathir Mohammad'} phone={'8801521438557'} hall={'Suhrawardi'} bloodGroup={'B+'}/>
    </MainCard>
    <MainCard title="Add New Super Admin">
        <MyTextField id="new-superadmin-phone" label="Enter Phone Number"/>
        <br/>
        <MyButton text={'Appoint New Super Admin'} color={'primary'}/>
    </MainCard>
    </React.Fragment>
);

export default SuperAdmin;
