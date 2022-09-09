import {Request, Response} from "express";
import OKResponse200 from "../response/models/successTypes/OKResponse200";
import InternalServerError500 from "../response/models/errorTypes/InternalServerError500";
import * as testInterface from "../db/interfaces/testInterface"

const handleInternalServerErrorInController = async (req: Request, res: Response): Promise<Response> => {
    // this route is deliberately written to generate an internal server error to test unknown fallback cases from inside a controller
    throw {"dummy":"intentional internal server error"}
    return res.status(200).send(new OKResponse200(`blah blah does not matter`,{}))
}

const handleInternalServerErrorInDBInterface = async (_req: Request, _res: Response): Promise<void> => {
    await testInterface.generateInternalServerErrorFromInterface()
    return
}
export default {
    handleInternalServerErrorInController,
    handleInternalServerErrorInDBInterface
}
