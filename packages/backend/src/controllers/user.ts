import { Router, json, Request, Response } from "express";
import { prisma } from "../prisma";
import { createHash, randomBytes } from "node:crypto";
import { handleHttpError, HttpError } from "../httpError";
import { isEmail } from "validator";

const userRouter = Router();

export async function createUser(name:string, email:string, password:string) {
    const salt = randomBytes(128).toString("hex");
    const hashedPassword = createHash("sha256").update(password + salt).digest("hex");
    if (!isEmail(email)) {
        throw new HttpError(400, "Invalid email");
    }
    await prisma.user.create({
        data: {
            name: name,
            email: email,
            password: hashedPassword,
            salt: salt,
        }
    });
};

userRouter.post("/", json(), async (req:Request, res:Response) => {
    try {
        const {name, email, password} = req.body;
        await createUser(name, email, password);
        res.status(201).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});