import { Response } from "express";

class HttpError extends Error {
    name = "HttpError";
    status: number;

    constructor(status: number, message: string) {
        super();
        this.message = message;
        this.status = status;
    }

    static fromError(error: Error): HttpError {
        let status: number;
        let message: string;
        switch (error.name) {
            case "JsonWebTokenError":
            case "ValidationError": //mongoose validation error
                status = 400;
                message = error.message;
                break;
            case "TokenExpiredError":
                status = 403;
                message = "Token expired";
                break;
            default:
                status = 500;
                message = "Internal server error";
        }
        return new HttpError(status, message);
    }
}

async function handleHttpError(error: any, res: Response) {
    if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message }).end();
    } else if (error instanceof Error) {
        const newError = HttpError.fromError(error);
        res.status(newError.status).json({ error: newError.message }).end();
    } else {
        res.status(418).json({ error: "your errors have errors" }).end();
    }
}

export { HttpError, handleHttpError };