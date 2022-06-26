// project imports
import React, {useEffect, useState} from 'react';
import MyMainCard from "../../ui-component/cards/MyMainCard";
import ContributorCard from "../../ui-component/contributors/ContributorCard";
import {ContributorLinkModel, ContributorModel} from "../../ui-component/contributors/contributorModel";
import {CONTRIBUTOR_ACTIVE_DEVELOPERS, CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN} from "../../ui-component/contributors/contributorModel";
import {wait} from "../../utils/dummyAPI";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notificationModel";

const dummyData: ContributorModel[] = [
    new ContributorModel(
        '123',
        'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fmahathir.jpg?alt=media',
        'Mir Mahathir Mohammad',
        'Jan 2020- Present',
        CONTRIBUTOR_ACTIVE_DEVELOPERS,
        [
            new ContributorLinkModel('www.facebook.com','facebook','blue'),
            new ContributorLinkModel('www.google.com','gmail','red')
        ],
        ['UX developer', 'Hybrid app Developer']
    ),
    new ContributorModel(
        '123456',
        'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fsanjubasak.jpg?alt=media',
        'Basak',
        'Jan 2022- Present',
        CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN,
        [new ContributorLinkModel('www.facebook.com','gmail','red')],
        ['Backend Engineer']
    )
]

const Contributors = () => {
    //STATE MANAGEMENT
    const [contributorsLoader, setContributorsLoader] = useState<boolean>(false)
    const [contributorsError, setContributorsError] = useState<boolean>(false)
    const [contributorList, setContributorList] = useState<ContributorModel[]>([])
    const [contributorDeleteFlagArray, setContributorDeleteFlagArray] = useState<boolean[]>([])
    const [contributorSaveChangesFlagArray, setContributorSaveChangesFlagArray] = useState<boolean[]>([])
    const dispatch = useDispatch()

    //HANDLERS
    useEffect(()=>{
        const loadAllContributors = async () => {
            setContributorsLoader(prevState => true)
            try{
                await wait()
                setContributorList(prevState => dummyData)
                setContributorDeleteFlagArray(prevState => Array(dummyData.length).fill(false))
                setContributorSaveChangesFlagArray(prevState => Array(dummyData.length).fill(false))
                dispatch(new NotificationSuccess('Successfully loaded contributors'))
            }catch (e) {
                setContributorsError(prevState => true)
                dispatch(new NotificationError('Failed to load contributors'))
            }finally {
                setContributorsLoader(prevState => false)
            }
        }
        loadAllContributors()
    },[dispatch])

    const resetDeleteFlags = () => {
        setContributorDeleteFlagArray(prevState => Array(dummyData.length).fill(false))
    }
    const resetSaveChangesFlags = () => {
        setContributorSaveChangesFlagArray(prevState => Array(dummyData.length).fill(false))
    }

    const setFlagForSpecificIndex = (prevState: boolean[], index: number) => {
        const newState = [...prevState]
        newState[index] = true;
        return newState
    }

    const handleDelete = async (contributor: ContributorModel, index: number) => {
        console.log(`inside Contributors.tsx handleDelete`);
        console.log(contributor)
        setContributorDeleteFlagArray(prevState => setFlagForSpecificIndex(prevState, index))
        try{
            await wait()
            dispatch(new NotificationSuccess('Successfully deleted contributor'))
        }catch (e) {
            dispatch(new NotificationError('Failed to delete contributor'))
        }finally {
            resetDeleteFlags()
        }
    }
    const handleSaveChanges = (contributor: ContributorModel) => {
        console.log(`inside Contributors.tsx handleSaveChanges`);
        console.log(contributor)
    }

    //MAIN COMPONENT
    return(
        <MyMainCard title="Manage Contributors">
            {contributorList.map((contributor: ContributorModel, index: number)=>
                <ContributorCard
                    index={index}
                    deleteLoader={contributorDeleteFlagArray[index]}
                    onHandleDelete={handleDelete}
                    onHandleSaveChanges={handleSaveChanges}
                    contributor={contributor}
                    key={contributor.id}
                />)}
        </MyMainCard>
    )
};

export default Contributors;
