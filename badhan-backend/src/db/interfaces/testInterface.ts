export const generateInternalServerErrorFromInterface = async ():Promise<{ dummy: string }>=>{
    throw {"dummy":"intentional internal server error"}
    return {dummy:'this code is not reachable'}
}
