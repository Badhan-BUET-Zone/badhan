export class ContributorLinkModel {
    link: string
    icon: string
    color: string
    id: string

    constructor(link: string, icon: string, color: string) {
        this.link = link;
        this.icon = icon;
        this.color = color;
        this.id = String(Math.random())
    }

}

export const validateContributorLink = (contributorLink: ContributorLinkModel): boolean => {
    if(contributorLink.link.trim().length===0)return true
    if(contributorLink.icon.trim().length===0)return true
    if(contributorLink.color.trim().length===0)return true
    return false
}

export const CONTRIBUTOR_ACTIVE_DEVELOPERS = 'Active Developers'
export const CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN = 'Contributors of Badhan'
export const CONTRIBUTOR_LEGACY_DEVELOPERS = 'Legacy Developers'

export type ContributorType = typeof CONTRIBUTOR_ACTIVE_DEVELOPERS | typeof CONTRIBUTOR_CONTRIBUTORS_FROM_BADHAN | typeof CONTRIBUTOR_LEGACY_DEVELOPERS


export class ContributorModel {
    id: string
    imageURL: string
    name: string
    duration: string
    memberType: ContributorType
    links: ContributorLinkModel[]
    contributions: string[]
    constructor(id: string, imageURL: string, name: string, duration: string, memberType: ContributorType, links: ContributorLinkModel[], contributions: string[]) {
        this.id = id
        this.imageURL = imageURL
        this.name = name
        this.duration = duration
        this.memberType = memberType
        this.links = links
        this.contributions = contributions
    }

    // hasOneFieldEmpty():boolean{

    // }
}

export const validateContributor = (contributor: ContributorModel):boolean => {
        if(contributor.imageURL.trim().length===0)return true
        if(contributor.name.trim().length===0)return true
        if(contributor.duration.trim().length===0)return true
        for(let i = 0; i < contributor.links.length; i++){
            if(validateContributorLink(contributor.links[i]))return true
        }
        for(let i = 0; i < contributor.contributions.length; i++){
            if(contributor.contributions[i].trim().length===0)return true
        }
        return false
}
