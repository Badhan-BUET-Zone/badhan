// project imports
import React, {Fragment, useEffect, useState} from 'react';
import MyMainCard from "../../ui-component/cards/MyMainCard";
import ContributorCard from "../../ui-component/contributors/ContributorCard";
import {
    CONTRIBUTOR_ACTIVE_DEVELOPERS,
    CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN,
    CONTRIBUTOR_LEGACY_DEVELOPERS,
    ContributorLinkModel,
    ContributorModel
} from "../../ui-component/contributors/contributorModel";
import {wait} from "../../utils/dummyAPI";
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notification/notificationModel";
import MySkeleton from "../../ui-component/MySkeleton";
import {Card, CardContent, Grid} from "@mui/material";
import UnderConstructionNotice from "../../ui-component/UnderConstructionNotice";
import {handleGETCredits} from "../../api";

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
            let response = await handleGETCredits()
            setContributorsLoader(prevState => false)
            if (response.status !== 200) {
                setContributorsError(prevState => true)
                dispatch(new NotificationError('Failed to load contributors'))
                return
            }

            const contributorArray = [...response.data[CONTRIBUTOR_ACTIVE_DEVELOPERS].map((contributor: {
                name: string,
                calender: string,
                image: string,
                contributions: string[],
                links: [{color: string, icon: string, link: string}]
            })=>new ContributorModel(contributor.name, contributor.image, contributor.name, contributor.calender, CONTRIBUTOR_ACTIVE_DEVELOPERS, contributor.links.map((link:{color: string, link: string, icon: string})=>new ContributorLinkModel(link.link,link.icon,link.color)),contributor.contributions)),
                ...response.data[CONTRIBUTOR_LEGACY_DEVELOPERS].map((contributor: {
                    name: string,
                    calender: string,
                    image: string,
                    contributions: string[],
                    links: [{color: string, icon: string, link: string}]
                })=>new ContributorModel(contributor.name, contributor.image, contributor.name, contributor.calender, CONTRIBUTOR_LEGACY_DEVELOPERS, contributor.links.map((link:{color: string, link: string, icon: string})=>new ContributorLinkModel(link.link,link.icon,link.color)),contributor.contributions)),
                ...response.data[CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN].map((contributor: {
                    name: string,
                    calender: string,
                    image: string,
                    contributions: string[],
                    links: [{color: string, icon: string, link: string}]
                })=>new ContributorModel(contributor.name, contributor.image, contributor.name, contributor.calender, CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN,contributor.links.map((link:{color: string, link: string, icon: string})=>new ContributorLinkModel(link.link,link.icon,link.color)),contributor.contributions)),
            ]

            setContributorList(prevState => contributorArray)
            setContributorDeleteFlagArray(prevState => Array(contributorArray.length).fill(false))
            setContributorSaveChangesFlagArray(prevState => Array(contributorArray.length).fill(false))
            dispatch(new NotificationSuccess('Successfully loaded contributors'))
        }
        loadAllContributors()
    }, [dispatch])

    const resetDeleteFlags = () => {
        setContributorDeleteFlagArray(prevState => Array(contributorList.length).fill(false))
    }
    const resetSaveChangesFlags = () => {
        setContributorSaveChangesFlagArray(prevState => Array(contributorList.length).fill(false))
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
                newState = newState.filter((contributor: ContributorModel) => contributor.id !== deletedContributor.id)
                return newState
            })
            dispatch(new NotificationSuccess('Successfully deleted contributor'))
        } catch (e) {
            dispatch(new NotificationError('Failed to delete contributor'))
        } finally {
            resetDeleteFlags()
        }
    }
    const handleSaveChanges = async (contributor: ContributorModel, newImageFile: Blob | null, index: number) => {
        console.log(`inside Contributors.tsx handleSaveChanges`);
        console.log(contributor)
        console.log(newImageFile)
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

    const contributorLoaderComponent = <MySkeleton
        loading={true}><Card><CardContent>Loading...</CardContent></Card></MySkeleton>

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
