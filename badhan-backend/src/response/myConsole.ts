// tslint:disable:no-console
export default {
    log: (...args: any[]):void=>{
        console.log.apply(console, args)
    },
    error: (...args: any[]):void=> {
        console.error.apply(console, args)
    }
}
