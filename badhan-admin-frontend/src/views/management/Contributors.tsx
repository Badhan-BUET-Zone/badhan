// project imports
import React, {Fragment, useEffect, useState} from 'react';
import MyMainCard from "../../ui-component/cards/MyMainCard";
import ContributorCard from "../../ui-component/contributors/ContributorCard";
import {ContributorLinkModel, ContributorModel} from "../../ui-component/contributors/contributorModel";
import {
    CONTRIBUTOR_ACTIVE_DEVELOPERS,
    CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN
} from "../../ui-component/contributors/contributorModel";
import {wait} from "../../utils/dummyAPI";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notification/notificationModel";
import MySkeleton from "../../ui-component/MySkeleton";
import {Card, CardContent, Grid} from "@mui/material";
import UnderConstructionNotice from "../../ui-component/UnderConstructionNotice";

const dummyData: ContributorModel[] = [
    new ContributorModel(
        '123',
        'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fmahathir.jpg?alt=media',
        'Mir Mahathir Mohammad',
        'Jan 2020- Present',
        CONTRIBUTOR_ACTIVE_DEVELOPERS,
        [
            new ContributorLinkModel('www.facebook.com', 'facebook', 'blue'),
            new ContributorLinkModel('www.google.com', 'gmail', 'red')
        ],
        ['UX developer', 'Hybrid app Developer']
    ),
    new ContributorModel(
        '123456',
        'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fsanjubasak.jpg?alt=media',
        'Basak',
        'Jan 2022- Present',
        CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN,
        [new ContributorLinkModel('www.facebook.com', 'gmail', 'red')],
        ['Backend Engineer']
    ),
    new ContributorModel(
        '123784658467676',
        'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fsanjubasak.jpg?alt=media',
        'Basak',
        'Jan 2022- Present',
        CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN,
        [new ContributorLinkModel('www.facebook.com', 'gmail', 'red')],
        ['Backend Engineer']
    ),
    new ContributorModel(
        '12378465846gfdgfhfh7676',
        'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fsanjubasak.jpg?alt=media',
        'Basak',
        'Jan 2022- Present',
        CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN,
        [new ContributorLinkModel('www.facebook.com', 'gmail', 'red')],
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
    useEffect(() => {
        const loadAllContributors = async () => {
            setContributorsLoader(prevState => true)
            try {
                await wait()
                setContributorList(prevState => dummyData)
                setContributorDeleteFlagArray(prevState => Array(dummyData.length).fill(false))
                setContributorSaveChangesFlagArray(prevState => Array(dummyData.length).fill(false))
                dispatch(new NotificationSuccess('Successfully loaded contributors'))
            } catch (e) {
                setContributorsError(prevState => true)
                dispatch(new NotificationError('Failed to load contributors'))
            } finally {
                setContributorsLoader(prevState => false)
            }
        }
        loadAllContributors()
    }, [dispatch])

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

    const handleDelete = async (deletedContributor: ContributorModel, index: number) => {
        console.log(`inside Contributors.tsx handleDelete`);
        console.log(deletedContributor)
        setContributorDeleteFlagArray(prevState => setFlagForSpecificIndex(prevState, index))
        try {
            await wait()
            setContributorList(prevState => {
                let newState = [...prevState]
                newState = newState.filter((contributor:ContributorModel)=>contributor.id!==deletedContributor.id)
                return newState
            })
            dispatch(new NotificationSuccess('Successfully deleted contributor'))
        } catch (e) {
            dispatch(new NotificationError('Failed to delete contributor'))
        } finally {
            resetDeleteFlags()
        }
    }
    const handleSaveChanges = async (contributor: ContributorModel, index: number) => {
        console.log(`inside Contributors.tsx handleSaveChanges`);
        console.log(contributor)
        setContributorSaveChangesFlagArray(prevState => setFlagForSpecificIndex(prevState, index))
        try {
            await wait()
            dispatch(new NotificationSuccess('Successfully saved changes'))
        } catch (e) {
            dispatch(new NotificationError('Failed to save changes'))
        } finally {
            resetSaveChangesFlags()
        }
    }

    // CONDITIONAL RENDERING

    const contributorLoaderComponent = <MySkeleton loading={true}><Card><CardContent>Loading...</CardContent></Card></MySkeleton>

    const contributorErrorComponent = <p>Error in loading contributors</p>

    const contributorEmptyComponent = <p>Contributor list empty</p>

    const contributorListComponent =
        <Grid container>
            {contributorList.map((contributor: ContributorModel, index: number) =>
                <Grid item xs={12} md={4} key={contributor.id}>
                    <ContributorCard
                        index={index}
                        deleteLoader={contributorDeleteFlagArray[index]}
                        saveChangesLoader={contributorSaveChangesFlagArray[index]}
                        onHandleDelete={handleDelete}
                        onHandleSaveChanges={handleSaveChanges}
                        contributor={contributor}
                    />
                </Grid>)
            }
        </Grid>

    let contributorFinalContent: JSX.Element | JSX.Element[]

    if (contributorsLoader) {
        contributorFinalContent = contributorLoaderComponent
    } else if (contributorsError) {
        contributorFinalContent = contributorErrorComponent
    } else if (contributorList.length === 0) {
        contributorFinalContent = contributorEmptyComponent
    } else {
        contributorFinalContent = contributorListComponent
    }

    //MAIN COMPONENT
    return (
        <Fragment>
            <UnderConstructionNotice/>
            <MyMainCard title="Manage Contributors">
                {contributorFinalContent}
            </MyMainCard>
        </Fragment>

    )
};

export default Contributors;
