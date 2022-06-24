// material-ui

// project imports
import {SuperAdminCard} from "../../ui-component/superadmin/SuperAdminCard";
import React, {useEffect, useState} from 'react'
import MyTextField from "../../ui-component/MyTextField";
import MyButton from "../../ui-component/MyButton";
import MyMainCard from "../../ui-component/cards/MyMainCard";
import {wait} from "../../utils/dummyAPI";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notificationModel";
import MySkeleton from "../../ui-component/MySkeleton";

// ==============================|| SAMPLE PAGE ||============================== //

const dummyAdmins = [{
    id: 'dshgoeinbgwe',
    name: 'Mir Mahathir Mohammad',
    phone: '8801521438557',
    hall: 'Suhrawardi',
    bloodGroup: 'B+',
}, {
    id: 'sdhsgoiegiohib',
    name: 'Mir Sayeed Mohammad',
    phone: '8801521438556',
    hall: 'Ahsanullah',
    bloodGroup: 'B-',
}, {
    id: 'ofdhuroihnjrehnd',
    name: 'Sumaiya Azad',
    phone: '8801521438559',
    hall: 'Sabekun Nahar Sony',
    bloodGroup: 'O+'
}, {
    id: 'oighriohjthnthjb',
    name: 'Mahmudul Hasah Rahat',
    phone: '8801711203634',
    hall: 'Nazrul',
    bloodGroup: 'B+'
}]

const SkeletonsSuperAdmin : React.FC = () => {
    return (
        <MySkeleton loading={true}>
            <SuperAdminCard name={'dummy'} phone={'dummy'} hall={'dummy'} bloodGroup={'dummy'}/>
        </MySkeleton>
    )
}

const SuperAdmin = () => {
    const [superAdminLoadingFlag, setSuperAdminLoadingFlag] = useState<boolean>(true)
    const [superAdminLoadingErrorFlag, setSuperAdminLoadingErrorFlag] = useState<boolean>(false)
    const dispatch = useDispatch();
    useEffect(() => {
        const loadSuperAdmins = async () => {
            try {
                setSuperAdminLoadingFlag(prevState => true);
                await wait();
                dispatch(new NotificationSuccess('Successfully loaded super admins'))
            } catch (e) {
                setSuperAdminLoadingErrorFlag(prevState => true)
                dispatch(new NotificationError('Super admin load failed'))
            } finally {
                setSuperAdminLoadingFlag(prevState => false);
            }
        }
        loadSuperAdmins()
    }, [dispatch])

    let superAdminList : JSX.Element[]|JSX.Element = <SkeletonsSuperAdmin/>

    if(superAdminLoadingErrorFlag){
        superAdminList = <React.Fragment>Error In Loading Super Admins</React.Fragment>
    }

    if(!superAdminLoadingFlag && !superAdminLoadingErrorFlag){
        superAdminList = dummyAdmins.map((superAdmin, index) =>
            <SuperAdminCard key={superAdmin.id} name={superAdmin.name} phone={superAdmin.phone} hall={superAdmin.hall} bloodGroup={superAdmin.bloodGroup}/>)
    }

    return (
        <React.Fragment>
            <MyMainCard title="List of Super Admins">
                { superAdminList }
            </MyMainCard>
            <MyMainCard title="Add New Super Admin">
                <MyTextField id="new-superadmin-phone" label="Enter Phone Number" value={""}/>
                <br/>
                <MyButton text={'Appoint New Super Admin'} color={'primary'} onClick={() => {
                }}/>
            </MyMainCard>
        </React.Fragment>
    )
};

export default SuperAdmin;
