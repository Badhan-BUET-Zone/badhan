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
import {useDispatch} from "react-redux";
import {NotificationError, NotificationSuccess} from "../../store/notification/notificationModel";
import MySkeleton from "../../ui-component/MySkeleton";
import {Card, CardContent, Grid} from "@mui/material";
import {
    handleDELETEContributor,
    handlePOSTContributorImage,
    handleGETContributor,
    handlePOSTContributor, handlePATCHContributor
} from "../../api";

const initialNewContributor = new ContributorModel(
    'newDonor',
    'https://www.pngitem.com/pimgs/m/256-2560200_username-conversion-account-icon-png-transparent-png.png',
    'New User',
    'User Duration',
    CONTRIBUTOR_ACTIVE_DEVELOPERS,
    [],
    []
)

const Contributors = () => {
    //STATE MANAGEMENT
    const [contributorsLoader, setContributorsLoader] = useState<boolean>(false)
    const [contributorsError, setContributorsError] = useState<boolean>(false)
    const [contributorList, setContributorList] = useState<ContributorModel[]>([])
    const [contributorDeleteFlagArray, setContributorDeleteFlagArray] = useState<boolean[]>([])
    const [contributorSaveChangesFlagArray, setContributorSaveChangesFlagArray] = useState<boolean[]>([])
    const dispatch = useDispatch()
    const [newContributorLoaderFlag, setNewContributorLoaderFlag] = useState<boolean>(false)
    const [newContributor, setNewContributor] = useState<ContributorModel>(initialNewContributor)

    //HANDLERS
    useEffect(() => {
        const loadAllContributors = async () => {
            setContributorsLoader(prevState => true)
            let response = await handleGETContributor()
            setContributorsLoader(prevState => false)
            if (response.status !== 200) {
                setContributorsError(prevState => true)
                dispatch(new NotificationError(response.data.message))
                return
            }

            const contributorArray = [...response.data.contributors['activeDevelopers'].map((contributor: {
                id: string
                name: string,
                calender: string,
                imageUrl: string,
                contribution: string[],
                links: [{ color: string, icon: string, link: string }]
            }) => new ContributorModel(contributor.id, contributor.imageUrl, contributor.name, contributor.calender, CONTRIBUTOR_ACTIVE_DEVELOPERS, contributor.links.map((link: { color: string, link: string, icon: string }) => new ContributorLinkModel(link.link, link.icon, link.color)), contributor.contribution)),
                ...response.data.contributors['legacyDevelopers'].map((contributor: {
                    id: string,
                    name: string,
                    calender: string,
                    imageUrl: string,
                    contribution: string[],
                    links: [{ color: string, icon: string, link: string }]
                }) => new ContributorModel(contributor.id, contributor.imageUrl, contributor.name, contributor.calender, CONTRIBUTOR_LEGACY_DEVELOPERS, contributor.links.map((link: { color: string, link: string, icon: string }) => new ContributorLinkModel(link.link, link.icon, link.color)), contributor.contribution)),
                ...response.data.contributors['contributorsOfBadhan'].map((contributor: {
                    id: string
                    name: string,
                    calender: string,
                    imageUrl: string,
                    contribution: string[],
                    links: [{ color: string, icon: string, link: string }]
                }) => new ContributorModel(contributor.id, contributor.imageUrl, contributor.name, contributor.calender, CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN, contributor.links.map((link: { color: string, link: string, icon: string }) => new ContributorLinkModel(link.link, link.icon, link.color)), contributor.contribution)),
            ]

            setContributorList(prevState => contributorArray)
            setContributorDeleteFlagArray(prevState => Array(contributorArray.length).fill(false))
            setContributorSaveChangesFlagArray(prevState => Array(contributorArray.length).fill(false))
            dispatch(new NotificationSuccess('Successfully loaded contributors'))
        }
        loadAllContributors()
    }, [dispatch])

    const handleSaveNewContributor = async (contributor: ContributorModel, newImageFile: Blob | null, _index: number) => {
        console.log(`inside Contributors.tsx new contributor`);
        console.log(contributor)
        console.log(newImageFile)
        setNewContributorLoaderFlag(prevState => true)
        const response = await handlePOSTContributor({
            name: contributor.name,
            calender: contributor.duration,
            contribution: contributor.contributions,
            links: contributor.links.map((link: ContributorLinkModel) => {
                return {
                    color: link.color,
                    icon: link.icon,
                    link: link.link
                }
            }),
            type: contributor.memberType
        })
        setNewContributorLoaderFlag(prevState => false)
        if (response.status !== 201) {
            dispatch(new NotificationError(response.data.message))
            return
        }
        contributor.id = response.data.contributor.id
        setContributorList((prevState: ContributorModel[]) => [...prevState, contributor])
        setContributorDeleteFlagArray(prevState => Array(contributorList.length + 1).fill(false))
        setContributorSaveChangesFlagArray(prevState => Array(contributorList.length + 1).fill(false))

        dispatch(new NotificationSuccess('Successfully saved changes'))
        handleClearNewContributor()
    }

    const handleClearNewContributor = () => {
        setNewContributor(prevState => initialNewContributor)
    }

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
        const response = await handleDELETEContributor({id: deletedContributor.id})
        resetDeleteFlags()
        if (response.status !== 200) {
            dispatch(new NotificationError(response.data.message))
            return
        }
        setContributorList(prevState => {
            let newState = [...prevState]
            newState = newState.filter((contributor: ContributorModel) => contributor.id !== deletedContributor.id)
            return newState
        })
        dispatch(new NotificationSuccess('Successfully deleted contributor'))

    }
    const handleSaveChanges = async (contributor: ContributorModel, newImageFile: Blob | null, index: number) => {
        console.log(`inside Contributors.tsx handleSaveChanges`);
        console.log(contributor)
        console.log(newImageFile)
        setContributorSaveChangesFlagArray(prevState => setFlagForSpecificIndex(prevState, index))
        if(newImageFile){
            const formData = new FormData()
            formData.append('image',newImageFile)
            const imageUploadResponse = await handlePOSTContributorImage({id: contributor.id, formData: formData})
            if(imageUploadResponse.status!==200){
                dispatch(new NotificationError(imageUploadResponse.data.message))
                return
            }
        }

        const patchResponse = await handlePATCHContributor({
            id: contributor.id,
            type: contributor.memberType,
            name: contributor.name,
            contribution: contributor.contributions,
            links: contributor.links.map((link: ContributorLinkModel) => {
                return {
                    color: link.color,
                    icon: link.icon,
                    link: link.link
                }
            }),
            calender: contributor.duration
        })
        resetSaveChangesFlags()
        if (patchResponse.status !== 200) {
            dispatch(new NotificationError(patchResponse.data.message))
            return
        }
        dispatch(new NotificationSuccess('Successfully saved changes'))

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
                        hideImageUpload={false}
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
            <MyMainCard title="Manage Contributors">
                {contributorFinalContent}
            </MyMainCard>
            <MyMainCard title={"Create New Contributor"}>
                <ContributorCard
                    index={-1}
                    contributor={newContributor}
                    onHandleSaveChanges={handleSaveNewContributor}
                    onHandleDelete={handleClearNewContributor}
                    deleteLoader={false}
                    saveChangesLoader={newContributorLoaderFlag}
                    hideImageUpload={true}
                />
            </MyMainCard>
        </Fragment>

    )
};

export default Contributors;
