// project imports
import React from 'react';
import MyMainCard from "../../ui-component/cards/MyMainCard";
import ContributorCard from "../../ui-component/contributors/ContributorCard";
import {ContributorLinkModel, ContributorModel} from "../../ui-component/contributors/contributorModel";

const dummyData: ContributorModel[] = [
    new ContributorModel(
        '123',
        'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/profilepics%2Fmahathir.jpg?alt=media',
        'Mir Mahathir Mohammad',
        'Jan 2020- Present',
        'Active Developer',
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
        'Legacy Developer',
        [new ContributorLinkModel('www.facebook.com','gmail','red')],
        ['Backend Engineer']
    )
]

const Contributors = () => {
    return(
        <MyMainCard title="Manage Contributors">
            {dummyData.map((contributor: ContributorModel)=>
                <ContributorCard
                    contributor={contributor}
                    key={contributor.id}
                />)}
        </MyMainCard>
    )
};

export default Contributors;
