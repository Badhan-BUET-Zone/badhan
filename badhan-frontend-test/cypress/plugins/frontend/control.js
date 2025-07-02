import env from '../env'
export default {
    scroll: {
        top: ()=>{
            cy.scrollTo('top')
        },
        botton: ()=>{
            cy.scrollTo('bottom')
        }
    },
    wait: (milliseconds)=> {
        cy.wait(milliseconds)
    },
    start: ()=> {
        cy.visit(env.FRONTEND_URL)
    },
    reload: ()=>{
        cy.reload()
    },
    clearLocalStorage: ()=>{
        cy.clearLocalStorage()
    }
}