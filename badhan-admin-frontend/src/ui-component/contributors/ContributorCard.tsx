import {Box, Button, Card, CardContent, Chip, MenuItem, SelectChangeEvent, Typography} from "@mui/material";
import MyTextField from "../MyTextField";
import Select from "@mui/material/Select";
import MyButton from "../MyButton";
import React, {useEffect, useReducer} from "react";
import {ContributorLinkModel, ContributorModel} from "./contributorModel";

const initialState: ContributorModel = new ContributorModel(
    'dummy',
    'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fmahathir.jpg?alt=media',
    'Mir Mahathir Mohammad',
    'Jan 2020- Present',
    'Active Developer',
    [
        new ContributorLinkModel('www.facebook.com','facebook','blue'),
        new ContributorLinkModel('www.google.com','gmail','red')
    ],
    ['UX developer', 'Hybrid app Developer']
)

function contributorLoadReducer(state: ContributorModel, action:{type: string, contributor: ContributorModel}) {
    switch (action.type) {
        case 'load':
            return action.contributor;
        default:
            throw new Error();
    }
}

const ContributorCard = (props:{contributor: ContributorModel}) => {
    const [memberType, setMemberType] = React.useState('Legacy Developer');
    const [isAddContributionShown, setIsAddContributionShown] = React.useState(false);
    const [isAddLinkShown, setIsAddLinkShown] = React.useState(false);

    const [stateContributor, dispatchContributor] = useReducer(contributorLoadReducer, initialState);

    const handleChange = (event: SelectChangeEvent) => {
        setMemberType(event.target.value as string);
    };

    useEffect(()=>{
        dispatchContributor({type: 'load', contributor: props.contributor})
    },[props.contributor])

    return (
      <Card variant={'outlined'} sx={{maxWidth: '300px'}}>
          <CardContent>
              <Button
                  component="label"
              >
                  <Box
                      component="img"
                      sx={{
                          height: 100,
                          borderRadius: '50px'
                      }}
                      alt="The house from the offer."
                      src={stateContributor.imageURL}
                  />
                  <input
                      type="file"
                      hidden
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
                  }} >
                      Update
                  </div>
              </Button>
              <MyTextField id={stateContributor.id+'name'} label={'Name of Contributor'} value={stateContributor.name}/>
              <br/>
              <MyTextField id={stateContributor.id+'duration'} label={'Duration of Service'} value={stateContributor.duration}/>
              <br/>
              <Select
                  sx={{margin: '10px'}}
                  labelId="Member Type"
                  id={stateContributor.id + 'memberType'}
                  value={memberType}
                  onChange={handleChange}
              >
                  <MenuItem value={'Active Developer'}>Active Developer</MenuItem>
                  <MenuItem value={'Contributors from Badhan'}>Contributors from Badhan</MenuItem>
                  <MenuItem value={'Legacy Developer'}>Legacy Developer</MenuItem>
              </Select>
              {!isAddContributionShown && <MyButton text={'Show Add Contribution'} color={'primary'} onClick={() => {
                  setIsAddContributionShown(true)
              }}/>}
              {isAddContributionShown && <Card variant={'outlined'}>
                  <CardContent>
                      <MyTextField id={stateContributor.id+'contributions'} label={'Add Contribution'}/>
                      <MyButton text={'Add Contribution'} color={'primary'} onClick={()=>{}}/>
                      <MyButton text={'Cancel'} color={'warning'} onClick={()=>{setIsAddContributionShown(false)}}/>
                  </CardContent>
              </Card>}

              <Box sx={{margin: '10px'}}>
                  <Typography sx={{margin: '10px'}} variant={'body1'}>
                      Contributions:
                  </Typography>
                  {stateContributor.contributions.map((contribution: string)=>{
                      return (
                          <Chip key={contribution} sx={{margin: '5px'}} label={contribution} onDelete={() => {}}/>
                      )
                  })}
              </Box>

              {!isAddLinkShown && <MyButton text={'Show Add Link'} color={'primary'} onClick={() => {
                  setIsAddLinkShown(true)
              }}/>}
              {isAddLinkShown && <Card variant={'outlined'}>
                  <CardContent>
                      <MyTextField id={stateContributor.id+'linkColor'} label={'Add Color'}/>
                      <MyTextField id={stateContributor.id+'linkIcon'} label={'Add Link Icon'}/>
                      <MyTextField id={stateContributor.id+'link'} label={'Add Profile Link'}/>
                      <MyButton text={'Add Link'} color={'primary'} onClick={() => {}}/>
                      <MyButton text={'Cancel'} color={'warning'} onClick={()=>{setIsAddLinkShown(false)}}/>
                  </CardContent>
              </Card>}


              <Box sx={{margin: '10px'}}>
                  <Typography sx={{margin: '10px'}} variant={'body1'}>
                      Links:
                  </Typography>

              </Box>

              {stateContributor.links.map((link: ContributorLinkModel)=>{
                  return (
                      <Card variant={'outlined'} key={link.link}>
                      <CardContent>
                          <Typography variant={'body1'} sx={{width: '200px', overflowWrap: 'break-word'}}>
                              {link.color} - {link.icon} - <a
                              href={link.link}>{link.link}</a>
                          </Typography>
                          <MyButton text={'Delete'} color={'warning'} onClick={() => {
                          }}/>
                      </CardContent>
                  </Card>)
                  })
                  }
              <MyButton text={'Save Changes of Contributor'} color={'primary'} onClick={()=>{}}/>
          </CardContent>
      </Card>
  )
}
export default ContributorCard
