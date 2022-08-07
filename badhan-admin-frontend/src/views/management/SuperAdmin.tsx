// material-ui

// project imports
import {SuperAdminCard} from "../../ui-component/superadmin/SuperAdminCard";
import React, {useEffect, useRef, useState} from 'react'
import MyTextField from "../../ui-component/MyTextField";
import MyButton from "../../ui-component/MyButton";
import MyMainCard from "../../ui-component/cards/MyMainCard";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notification/notificationModel";
import MySkeleton from "../../ui-component/MySkeleton";
import FadeAnimationWrapper from "../../ui-component/motion/FadeAnimationWrapper";
import useValidate from "../../hooks/useValidate";
import {Grid} from "@mui/material";
import {handleGETDonorsDesignation, handlePATCHAdminsSuperAdmin} from "../../api";
import {halls} from '../../utils/constants'

class SuperAdminModel {
    id: string
    name: string
    phone: string
    hall: string

    constructor(id: string, name: string, phone: string, hall: string) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.hall = hall;
    }
}

const validateDonorId = (phone: any) => {
    return String(phone).length >= 20? false: 'Donor Id is not valid'
}

const SuperAdmin = () => {
    const [superAdminLoadingFlag, setSuperAdminLoadingFlag] = useState<boolean>(true)
    const [superAdminLoadingErrorFlag, setSuperAdminLoadingErrorFlag] = useState<boolean>(false)
    const [superAdminDeleteLoaderFlagsArray, setSuperAdminDeleteLoaderFlagsArray] = useState<boolean[]>([])
    const [superAdmins, setSuperAdmins] = useState<SuperAdminModel[]>([])
    const [newSuperAdminLoaderFlag, setNewSuperAdminLoaderFlag] = useState<boolean>(false)
    const newSuperAdminId = useValidate<string>('', validateDonorId)

    const newSuperAdminIdRef = useRef() as React.MutableRefObject<HTMLInputElement>;
    const dispatch = useDispatch();
    useEffect(() => {
        const loadSuperAdmins = async () => {
            setSuperAdminLoadingFlag(prevState => true);
            const response = await handleGETDonorsDesignation()
            setSuperAdminLoadingFlag(prevState => false);
            if (response.status !== 200) {
                setSuperAdminLoadingErrorFlag(prevState => true)
                dispatch(new NotificationError(response.data.message))
                return
            }

            setSuperAdmins(prevState => response.data.superAdminList.map((superAdmin: { _id: string, studentId: string, name: string, phone: number, hall: number }) => {
                return new SuperAdminModel(superAdmin._id, superAdmin.name, String(superAdmin.phone), halls[superAdmin.hall])
            }))
            setSuperAdminDeleteLoaderFlagsArray(prevState => Array(response.data.superAdminList.length).fill(false))
            dispatch(new NotificationSuccess('Successfully loaded super admins'))
        }
        loadSuperAdmins()
    }, [dispatch])

    const onnewSuperAdminIdInput = (phoneText: string) => {
        newSuperAdminId.setValue(phoneText)
    }

    const handleNewSuperAdmin = async () => {
        newSuperAdminId.touch()
        if (newSuperAdminId.hasError) return

        const newSuperAdminIdValue = newSuperAdminIdRef.current.value
        console.log(`newSuperAdminId: ${newSuperAdminIdValue}`)

        setNewSuperAdminLoaderFlag(prevState => true)
        const response = await handlePATCHAdminsSuperAdmin({donorId: newSuperAdminIdValue, promoteFlag: true})
        setNewSuperAdminLoaderFlag(prevState => false)
        newSuperAdminId.reset()

        if (response.status !== 200) {
            dispatch(new NotificationError(response.data.message))
            return
        }

        const newSuperAdmin = response.data.donor
        setSuperAdmins(prevState => {
            const newState = [...prevState]
            newState.push(new SuperAdminModel(newSuperAdmin._id, newSuperAdmin.name, newSuperAdmin.phone, halls[newSuperAdmin.hall]))
            return newState
        })
        dispatch(new NotificationSuccess('Successfully assigned new super admin'))
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
        setDeleteFlagForSpecificIndex(deletedSuperAdminIndex);

        const response = await handlePATCHAdminsSuperAdmin({donorId: deletedSuperAdminId, promoteFlag: false});
        resetAllDeleteFlag()
        if (response.status !== 200) {
            dispatch(new NotificationError(response.data.message))
            return
        }
        setSuperAdmins(prevState => {
            return prevState.filter((superAdmin: SuperAdminModel) => superAdmin.id !== deletedSuperAdminId)
        })
        dispatch(new NotificationSuccess('Successfully deleted super admin'))
    }


    const superAdminLoader = <MySkeleton loading={true}>
        <SuperAdminCard
            deleteFlag={false}
            id={'dummy'}
            name={'dummy'}
            phone={'dummy'}
            hall={'dummy'}
            onDeleteHandler={() => {
            }}
            index={0}
        />
    </MySkeleton>

    const superAdminErrorComponent = <React.Fragment>Error In Loading Super Admins</React.Fragment>

    const superAdminListComponent = <Grid container>
        {superAdmins.map((superAdmin: SuperAdminModel, index: number) =>
            <Grid item xs={12} md={4} key={superAdmin.id}>
                <SuperAdminCard
                    id={superAdmin.id}
                    name={superAdmin.name}
                    phone={superAdmin.phone}
                    hall={superAdmin.hall}
                    onDeleteHandler={onDeleteHandler}
                    deleteFlag={superAdminDeleteLoaderFlagsArray[index]}
                    index={index}
                />
            </Grid>
        )}
    </Grid>

    const superAdminListEmptyComponent = <p>Deletable Super Admin list is empty</p>

    let superAdminPopulatedContent: JSX.Element[] | JSX.Element

    if (superAdminLoadingFlag) {
        superAdminPopulatedContent = superAdminLoader
    } else if (superAdminLoadingErrorFlag) {
        superAdminPopulatedContent = superAdminErrorComponent
    } else if (superAdmins.length === 0) {
        superAdminPopulatedContent = superAdminListEmptyComponent
    } else {
        superAdminPopulatedContent = superAdminListComponent
    }

    return (
        <FadeAnimationWrapper>
            <MyMainCard title="List of Super Admins">
                {superAdminPopulatedContent}
            </MyMainCard>
            <MyMainCard title="Add New Super Admin">
                <MyTextField
                    ref={newSuperAdminIdRef}
                    id="new-superadmin-id"
                    label="Enter Donor Id"
                    error={newSuperAdminId.hasError}
                    onBlur={newSuperAdminId.touch}
                    helperText={newSuperAdminId.message}
                    value={newSuperAdminId.value}
                    onChange={onnewSuperAdminIdInput}
                />
                <br/>
                <MyButton
                    loading={newSuperAdminLoaderFlag}
                    text={'Appoint New Super Admin'}
                    color={'primary'}
                    onClick={handleNewSuperAdmin}
                    disabled={newSuperAdminId.hasError}
                />
            </MyMainCard>
        </FadeAnimationWrapper>
    )
};

export default SuperAdmin;
