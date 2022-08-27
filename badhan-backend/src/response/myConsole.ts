// tslint:disable:no-console
export default {
    log: (...args: any[])=>{
        console.log.apply(console, args)
    },
    error: (...args: any[])=> {
        console.error.apply(console, args)
    }
}
