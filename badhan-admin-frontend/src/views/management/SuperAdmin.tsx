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

class SuperAdminModel {
    id: string
    name: string
    phone: string
    hall: string
    bloodGroup: string

    constructor(id: string, name: string, phone: string, hall: string, bloodGroup: string) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.hall = hall;
        this.bloodGroup = bloodGroup;
    }
}

const SuperAdmin = () => {
    const [superAdminLoadingFlag, setSuperAdminLoadingFlag] = useState<boolean>(true)
    const [superAdminLoadingErrorFlag, setSuperAdminLoadingErrorFlag] = useState<boolean>(false)
    const [superAdminDeleteLoaderFlagsArray, setSuperAdminDeleteLoaderFlagsArray ] = useState<boolean[]>([])
    const [superAdmins, setSuperAdmins] = useState<SuperAdminModel[]>([])
    const [newSuperAdminLoaderFlag, setNewSuperAdminLoaderFlag] = useState<boolean>(false)
    const [newSuperAdminPhone, setNewSuperAdminPhone] = useState<string>('')
    const dispatch = useDispatch();
    useEffect(() => {
        const loadSuperAdmins = async () => {
            try {
                setSuperAdminLoadingFlag(prevState => true);
                await wait();
                setSuperAdmins(prevState => dummyAdmins)
                setSuperAdminDeleteLoaderFlagsArray(prevState => Array(dummyAdmins.length).fill(false))
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

    const onNewSuperAdminPhoneInput = (phoneText: string) =>{
        setNewSuperAdminPhone(prevState => phoneText)
    }

    const handleNewSuperAdmin = async () => {
        console.log(`handleNewSuperAdmin: ${newSuperAdminPhone}`)
        setNewSuperAdminLoaderFlag(prevState => true)
        try{
            await wait()
            setSuperAdmins(prevState => {
                const newState =  [...prevState]
                newState.push(new SuperAdminModel(String(Math.random()), 'New Admin', newSuperAdminPhone, 'Nazrul', 'B+'))
                return newState
            })
            dispatch(new NotificationSuccess('Successfully assigned new super admin'))
        }catch (e) {
            dispatch(new NotificationError('Failed to assign new super admin'))
        }finally {
            setNewSuperAdminLoaderFlag(prevState => false)
            setNewSuperAdminPhone(prevState => '')
        }
    }

    const setDeleteFlagForSpecificIndex = (index: number) => {
        setSuperAdminDeleteLoaderFlagsArray(prevState => {
            const newState = [...prevState]
            newState[index] = true
            return newState
        })
    }
    const resetAllDeleteFlag = () => {
        setSuperAdminDeleteLoaderFlagsArray(prevState => Array(superAdmins.length).fill(false))
    }

    const onDeleteHandler = async (deletedSuperAdminId: string, deletedSuperAdminIndex: number) => {
        console.log(`super admin id to be deleted ${deletedSuperAdminId} index ${deletedSuperAdminIndex}`);
        setDeleteFlagForSpecificIndex(deletedSuperAdminIndex);
        try{
            await wait()
            setSuperAdmins(prevState => {
                return prevState.filter((superAdmin: SuperAdminModel) => superAdmin.id !== deletedSuperAdminId)
            })
            dispatch(new NotificationSuccess('Successfully deleted super admin'))
        }catch (e) {
            dispatch(new NotificationError('Failed to delete super admin'))
        }finally {
            resetAllDeleteFlag()
        }
    }


    const superAdminLoader = <MySkeleton loading={true}>
        <SuperAdminCard
            deleteFlag={false}
            id={'dummy'}
            name={'dummy'}
            phone={'dummy'}
            hall={'dummy'}
            bloodGroup={'dummy'}
            onDeleteHandler={()=>{}}
            index={0}
        />
    </MySkeleton>

    const superAdminErrorComponent = <React.Fragment>Error In Loading Super Admins</React.Fragment>

    const superAdminListComponent = superAdmins.map((superAdmin: SuperAdminModel, index: number) =>
        <SuperAdminCard
            id={superAdmin.id}
            key={superAdmin.id}
            name={superAdmin.name}
            phone={superAdmin.phone}
            hall={superAdmin.hall}
            bloodGroup={superAdmin.bloodGroup}
            onDeleteHandler={onDeleteHandler}
            deleteFlag={superAdminDeleteLoaderFlagsArray[index]}
            index={index}
        />
    )

    const superAdminListEmptyComponent = <p>Deletable Super Admin list is empty</p>

    let superAdminPopulatedContent : JSX.Element[]|JSX.Element

    if(superAdminLoadingFlag){
        superAdminPopulatedContent = superAdminLoader
    }else if(superAdminLoadingErrorFlag){
        superAdminPopulatedContent = superAdminErrorComponent
    }else if (superAdmins.length===0) {
        superAdminPopulatedContent = superAdminListEmptyComponent
    }else {
        superAdminPopulatedContent = superAdminListComponent
    }

    return (
        <React.Fragment>
            <MyMainCard title="List of Super Admins">
                { superAdminPopulatedContent }
            </MyMainCard>
            <MyMainCard title="Add New Super Admin">
                <MyTextField id="new-superadmin-phone" label="Enter Phone Number" value={newSuperAdminPhone} onChange={onNewSuperAdminPhoneInput}/>
                <br/>
                <MyButton
                    loading={newSuperAdminLoaderFlag}
                    text={'Appoint New Super Admin'}
                    color={'primary'}
                    onClick={handleNewSuperAdmin}
                />
            </MyMainCard>
        </React.Fragment>
    )
};

export default SuperAdmin;
