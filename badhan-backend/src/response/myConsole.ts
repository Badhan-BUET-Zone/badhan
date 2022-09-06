// tslint:disable:no-console
export default {
    log: (...args: any[]):void=>{
        console.log.apply(console, ['BADHAN LOG: ',...args])
    },
    error: (...args: any[]):void=> {
        console.error.apply(console, ['BADHAN LOG: ',...args])
    }
}
