export const idStart = (elementId) => {
    return `[id^="${elementId}"]`
}

export const getTextFromIdStart = async (id, index) => {
    return new Promise((resolve => {
        cy.get(idStart(id)).eq(index) .invoke('text').then((text)=>{
            resolve(text)
        })
    }))
}

export const getResponseFromAPI = async (interceptor)=>{
    return new Promise((resolve,reject)=>{
        /// here if  ele exists or not
        cy.wait(interceptor).then((interception)=>{
            resolve(interception.response.body)
        })
    })
}
