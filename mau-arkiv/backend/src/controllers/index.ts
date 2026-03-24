import { Request, Response } from "express";

export class IndexController {
    getIndex(req: Request, res: Response): void {
        res.send('Welcome to the Express API!');
    }
}

export * from './archive-controller';