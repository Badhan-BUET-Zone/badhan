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
