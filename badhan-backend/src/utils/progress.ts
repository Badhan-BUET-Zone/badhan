import ProgressBar from 'progress'
export class Progress {
    bar: ProgressBar
    constructor(count: number){
        this.bar = new ProgressBar(':bar', { total: count });
    }
    tick(): void{
        this.bar.tick()
    }
}