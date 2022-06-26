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

}
