import {Document} from 'mongoose'
export abstract class DataFactory {
    abstract createData(data: Partial<Document>): Document
}