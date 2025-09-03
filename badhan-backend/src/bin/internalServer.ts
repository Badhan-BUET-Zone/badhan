import express, { Express } from 'express'
import internalRouter from '../internalRoutes'
import myConsole from '../utils/myConsole'
import '../db/mongoose'
import cors from 'cors'

// Prevent accidental run in production deployments
if (process.env.NODE_ENV === 'production') {
	// Fail fast so it cannot be exposed behind the main load balancer/reverse proxy
	throw new Error('Internal server must not run in production environment')
}

const app: Express = express()

// Enable CORS for local frontend (adjust origin list if needed)
const allowedOrigins: string[] = ['http://localhost:8080']
app.use(cors({
	origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
		if (!origin || allowedOrigins.includes(origin)) { callback(null, true); return }
		callback(new Error('Not allowed by CORS'))
	}
}))
// Basic manual preflight (avoids TS type issues with app.options & wildcard)
app.use((req: express.Request, res: express.Response, next: express.NextFunction): void => {
	const origin: string | undefined = req.headers.origin
	if (origin && allowedOrigins.includes(origin)) {
		res.header('Access-Control-Allow-Origin', origin)
		res.header('Vary', 'Origin')
	}
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
		if (req.method === 'OPTIONS') {
			res.sendStatus(204)
			return
		}
		next()
})

// Basic middleware parity (add more if your internal routes need them)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Mount internal routes at root; they each decide their own path prefix
app.use('/', internalRouter)

const port: number = parseInt(process.env.INTERNAL_PORT || '4000', 10)
app.listen(port, (): void => {
	myConsole.log(`Internal server listening on port ${port}`)
})
