const AsyncRouter = require('express-async-router').AsyncRouter
const router = AsyncRouter()
const validation = require('../validation')
const rateLimiter = require('../rateLimiter')
const {OKResponse200} = require("../response/successTypes");
const queue = require('../queue')
const {backupController, listController, deleteController, pruneController, restoreController} = require("../controllers");

const wait = () => {
    return new Promise((resolve, reject) => setTimeout(()=>{
        resolve(0)
    }, 3000));
}


router.delete('/backup/old',
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async (req,res)=>{
        await wait()
        const response = await pruneController()
        return res.status(response.statusCode).send(response)
    })

router.delete('/backup/date/:date',
    validation.validateDELETEBackup,
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async (req, res) => {
        const response = await deleteController({time: parseInt(req.params.date)})
        return res.status(response.statusCode).send(response)
    }
)

router.get('/backup',
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async(req, res) => {
        const response = await listController()
        return res.status(response.statusCode).send(response)
    })

router.post('/backup',
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async(req,res)=>{
        const response = await backupController()
        return res.status(response.statusCode).send(response)
    }
    )

router.post('/restore/:date',
    validation.validatePOSTRestore,
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async(req, res) => {
        const response = await restoreController({production: req.query.production === 'true', time: parseInt(req.params.date)})
        return res.status(response.statusCode).send(response)
    })

module.exports = router
