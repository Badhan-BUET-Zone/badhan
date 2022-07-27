import {Box, Button, Card, CardContent, Chip, MenuItem, SelectChangeEvent, Typography} from "@mui/material";
import MyTextField from "../MyTextField";
import Select from "@mui/material/Select";
import MyButton from "../MyButton";
import React, {ChangeEvent, useEffect, useReducer, useState} from "react";
import {
    CONTRIBUTOR_ACTIVE_DEVELOPERS,
    CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN, CONTRIBUTOR_LEGACY_DEVELOPERS,
    ContributorLinkModel,
    ContributorModel, ContributorType, validateContributor
} from "./contributorModel";
import styles from './ContributorCard.module.css'
import FadeAnimationWrapper from "../motion/FadeAnimationWrapper";
import {useDispatch} from "react-redux";
import {ConfirmationDialogOpen} from "../../store/confirmationDialog/model";

const initialState: ContributorModel = new ContributorModel(
    'dummy',
    'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fmahathir.jpg?alt=media',
    'Mir Mahathir Mohammad',
    'Jan 2020- Present',
    CONTRIBUTOR_ACTIVE_DEVELOPERS,
    [
        new ContributorLinkModel('www.facebook.com', 'facebook', 'blue'),
        new ContributorLinkModel('www.google.com', 'gmail', 'red')
    ],
    ['UX developer', 'Hybrid app Developer']
)

function contributorLoadReducer(state: ContributorModel, action: { type: string, contributor: ContributorModel }) {
    switch (action.type) {
        case 'load':
            return action.contributor;
        default:
            throw new Error();
    }
}


const ContributorCard = (props: {
    index: number,
    contributor: ContributorModel,
    onHandleSaveChanges: (contributor: ContributorModel, newImageFile: File | null, index: number) => void,
    onHandleDelete: (contributor: ContributorModel, index: number) => void,
    deleteLoader: boolean,
    saveChangesLoader: boolean
}) => {
    // STATE MANAGEMENT
    const [isAddContributionShown, setIsAddContributionShown] = useState<boolean>(false)
    const [isAddLinkShown, setIsAddLinkShown] = useState<boolean>(false)
    const [newContribution, setNewContribution] = useState<string>('')
    const [stateContributor, dispatchContributor] = useReducer(contributorLoadReducer, initialState)
    const [newLink, setNewLink] = useState<ContributorLinkModel>(new ContributorLinkModel('', '', ''))
    const [validationError, setValidationError] = useState<boolean>(false)
    const dispatch = useDispatch()

    const [newImageLocalURL, setNewImageLocalURL] = useState<string|null>(null)
    const [newImageFile, setNewImageFile] = useState<File|null>(null)

    // HANDLERS
    const handleContributorTypeSelectionChange = (event: SelectChangeEvent) => {
        dispatchContributor({
            type: 'load',
            contributor: {...stateContributor, memberType: event.target.value as ContributorType}
        })
    };

    const handleContributorNameChange = (name: string) => {
        dispatchContributor({
            type: 'load',
            contributor: {...stateContributor, name: name}
        })
    }

    const handleContributorDurationChange = (duration: string) => {
        dispatchContributor({
            type: 'load',
            contributor: {...stateContributor, duration: duration}
        })
    }

    const handleAddContribution = () => {
        const newContributor: ContributorModel = {...stateContributor}
        newContributor.contributions.push(newContribution)
        dispatchContributor({
            type: 'load',
            contributor: newContributor
        })
    }

    const handleDeleteContribution = (deletedContribution: string) => {
        const newContributor: ContributorModel = {...stateContributor}
        newContributor.contributions = newContributor.contributions.filter((contribution: string) => contribution !== deletedContribution)
        dispatchContributor({
            type: 'load',
            contributor: newContributor
        })
    }

    const handleSaveChanges = () => {
        setValidationError((prevState => false))
        console.log(`inside handleSaveChanges: stateContributor`)
        if(validateContributor(stateContributor)){
            setValidationError((prevState => true))
            return
        }
        props.onHandleSaveChanges(stateContributor, newImageFile, props.index)
    }
    const handleDelete = () => {
        console.log(`inside handleDelete: `)
        props.onHandleDelete(stateContributor, props.index)
    }
    const promptDelete  = () => {
        dispatch(new ConfirmationDialogOpen('Are you sure you want to delete this contributor?', handleDelete))
    }
    const fileSelectHandler = (event: ChangeEvent<HTMLInputElement>) => {
        if(!event.target.files)return
        const file = event.target.files[0];
        console.log("file")
        console.log(file)
        setNewImageFile((prevState => file))
        setNewImageLocalURL(prevState => URL.createObjectURL(file))
    }

    useEffect(() => {
        dispatchContributor({type: 'load', contributor: props.contributor})
    }, [props.contributor])

    const handleChangeLinkColor = (newColor: string) => {
        setNewLink(prevState => {
            return {...prevState, color: newColor}
        })
    }
    const handleChangeLinkSite = (newSite: string) => {
        setNewLink(prevState => {
            return {...prevState, link: newSite}
        })
    }
    const handleChangeLinkIcon = (newIcon: string) => {
        setNewLink(prevState => {
            return {...prevState, icon: newIcon}
        })
    }

    const handleAddNewLink = () => {
        const newContributor = {...stateContributor}
        newContributor.links.push(new ContributorLinkModel(newLink.link, newLink.icon, newLink.color))
        dispatchContributor({
            type: 'load',
            contributor: newContributor
        })
    }

    const handleDeleteLink = (id: string) => {
        const newContributor: ContributorModel = {...stateContributor}
        newContributor.links = newContributor.links.filter((link: ContributorLinkModel) => link.id !== id)
        dispatchContributor({
            type: 'load',
            contributor: newContributor
        })
    }

    // DYNAMIC CONTENT


    // MAIN CONTENT
    return (
        <FadeAnimationWrapper>
            <Card variant={'outlined'} className={styles.contributorCard}>
                <CardContent>
                    <Button
                        component="label"
                    >
                        <Box
                            component="img"
                            className={styles.contributorCardImageBox}
                            alt="The house from the offer."
                            src={newImageLocalURL || stateContributor.imageURL}
                        />
                        <input
                            type="file"
                            hidden onChange={fileSelectHandler}
                        />
                        <div style={{
                            position: 'absolute',
                            color: 'white',
                            top: '90%',
                            left: '50%',
                            padding: '5px',
                            transform: 'translate(-50%, -90%)',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderRadius: '20px'
                        }}>
                            Update
                        </div>
                    </Button>
                    <MyTextField
                        id={stateContributor.id + 'name'}
                        label={'Name of Contributor'}
                        value={stateContributor.name}
                        onChange={handleContributorNameChange}
                    />
                    <br/>
                    <MyTextField
                        id={stateContributor.id + 'duration'}
                        label={'Duration of Service'}
                        onChange={handleContributorDurationChange}
                        value={stateContributor.duration}
                    />
                    <br/>
                    <Select
                        className={styles.contributorCardContributorTypeSelect}
                        labelId="Member Type"
                        id={stateContributor.id + 'memberType'}
                        value={stateContributor.memberType}
                        onChange={handleContributorTypeSelectionChange}
                    >
                        <MenuItem value={CONTRIBUTOR_ACTIVE_DEVELOPERS}>Active Developers</MenuItem>
                        <MenuItem value={CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN}>Contributors from Badhan</MenuItem>
                        <MenuItem value={CONTRIBUTOR_LEGACY_DEVELOPERS}>Legacy Developers</MenuItem>
                    </Select>
                    {!isAddContributionShown &&
                        <MyButton text={'Show Add Contribution'} color={'primary'} onClick={() => {
                            setIsAddContributionShown(true)
                        }}/>}
                    {isAddContributionShown && <Card variant={'outlined'}>
                        <CardContent>
                            <MyTextField id={stateContributor.id + 'contributions'} label={'Add Contribution'}
                                         onChange={setNewContribution} value={newContribution}/>
                            <MyButton text={'Add Contribution'} color={'primary'} onClick={handleAddContribution}/>
                            <MyButton text={'Cancel'} color={'warning'} onClick={() => {
                                setIsAddContributionShown(false)
                            }}/>
                        </CardContent>
                    </Card>}

                    <Box className={styles.contributorCardContributionList}>
                        <Typography variant={'body1'}>
                            Contributions: ({stateContributor.contributions.length} contributions)
                        </Typography>
                        {stateContributor.contributions.map((contribution: string) => {
                            return (
                                <Chip key={contribution} className={styles.contributorCardContributionChip}
                                      label={contribution} onDelete={() => {
                                    handleDeleteContribution(contribution)
                                }}/>
                            )
                        })}
                    </Box>

                    {!isAddLinkShown && <MyButton text={'Show Add Link'} color={'primary'} onClick={() => {
                        setIsAddLinkShown(true)
                    }}/>}
                    {isAddLinkShown && <Card variant={'outlined'}>
                        <CardContent>
                            <MyTextField
                                onChange={handleChangeLinkColor}
                                value={newLink.color}
                                id={stateContributor.id + 'linkColor'}
                                label={'Add Color'}
                            />
                            <MyTextField
                                onChange={handleChangeLinkIcon}
                                value={newLink.icon}
                                id={stateContributor.id + 'linkIcon'}
                                label={'Add Link Icon'}
                            />
                            <MyTextField
                                onChange={handleChangeLinkSite}
                                value={newLink.link}
                                id={stateContributor.id + 'link'}
                                label={'Add Profile Link'}
                            />
                            <MyButton text={'Add Link'} color={'primary'} onClick={handleAddNewLink}/>
                            <MyButton text={'Cancel'} color={'warning'} onClick={() => {
                                setIsAddLinkShown(false)
                            }}/>
                        </CardContent>
                    </Card>}


                    <Box className={styles.contributorCardLinkList}>
                        <Typography variant={'body1'} className={styles.contributorCardLinkListTitle}>
                            Links: ({stateContributor.links.length} links)
                        </Typography>
                        {stateContributor.links.map((link: ContributorLinkModel) => {
                            return (
                                <Card variant={'outlined'} key={link.id}>
                                    <CardContent>
                                        <Typography variant={'body1'} className={styles.contributorCardLinkDetail}>
                                            {link.color} - {link.icon} - <a
                                            href={link.link}>{link.link}</a>
                                        </Typography>
                                        <MyButton text={'Delete'} color={'warning'} onClick={() => {
                                            handleDeleteLink(link.id)
                                        }}/>
                                    </CardContent>
                                </Card>)
                        })
                        }
                    </Box>
                    {validationError && <Box sx={{color: 'error.main'}}>
                        Empty field found. Please correct and submit.
                    </Box>}
                    <MyButton loading={props.saveChangesLoader} text={'Save Changes of Contributor'} color={'primary'}
                              onClick={handleSaveChanges}/>
                    <MyButton loading={props.deleteLoader} color={'warning'} onClick={promptDelete}
                              text={'Delete this Contributor'}/>
                </CardContent>
            </Card>
        </FadeAnimationWrapper>
    )
}
export default ContributorCard
