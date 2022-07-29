const AsyncRouter = require('express-async-router').AsyncRouter
const router = AsyncRouter()
const validation = require('../validation')
const rateLimiter = require('../rateLimiter')
const {OKResponse200} = require("../response/successTypes");
const queue = require('../queue')

router.delete('/backup/old',
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async (req,res)=>{
        res.status(200).send(new OKResponse200('Deleted old backups',{}))
    })

router.delete('/backup/date/:date',
    validation.validateDELETEBackup,
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async (req, res) => {
        console.log(req.params)
        res.status(200).send(new OKResponse200('Successfully deleted backup'))
    }
)

router.get('/backup',
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async(req, res) => {
        const backups = [1650383925655, 1650383935655, 1650481935655, 1657383925655, 1680383935655, 1650441935655]
        res.status(200).send(new OKResponse200('Backup list fetched',{backups}))
    })

router.post('/backup',
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async(req,res)=>{
        res.status(201).send(new OKResponse200('Created new backup'))
    }
    )

router.post('/restore/:date',
    validation.validatePOSTRestore,
    rateLimiter.commonLimiter,
    queue.commonQueue,
    async(req, res) => {
        const productionFlag = req.query.production === 'true'
        res.status(200).send(new OKResponse200('Backup restored',{productionFlag, date:req.params.date}))
    })



module.exports = router
