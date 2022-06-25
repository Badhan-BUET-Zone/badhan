export class ContributorLinkModel {
    link: string
    icon: string
    color: string

    constructor(link: string, icon: string, color: string) {
        this.link = link;
        this.icon = icon;
        this.color = color;
    }
}

export class ContributorModel {
    id: string
    imageURL: string
    name: string
    duration: string
    memberType: string
    links: ContributorLinkModel[]
    contributions: string[]
    constructor(id: string, imageURL: string, name: string, duration: string, memberType: string, links: ContributorLinkModel[], contributions: string[]) {
        this.id = id
        this.imageURL = imageURL
        this.name = name
        this.duration = duration
        this.memberType = memberType
        this.links = links
        this.contributions = contributions
    }
}
