export const wait = () => {
    return new Promise((resolve, reject) => setTimeout(()=>{
        if(Math.random()>0.5){
            resolve(0)
        }else{
            reject(1)
        }
    }, 2000));
}
