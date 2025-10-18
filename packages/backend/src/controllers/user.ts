import { Router, json, Request, Response } from "express";
import { prisma } from "../prisma";
import { createHash, randomBytes } from "node:crypto";
import { handleHttpError, HttpError } from "../httpError";
import { isEmail } from "validator";
import jwt from "jsonwebtoken";
import { load } from "ts-dotenv";

const env = load({
    JWT_SECRET:String
})

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
}

userRouter.post("/", json(), async (req:Request, res:Response) => {
    try {
        const {name, email, password} = req.body;
        await createUser(name, email, password);
        res.status(201).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function login(email:string, password:string):Promise<string> {
    const user = await prisma.user.findUniqueOrThrow({
        where: {
            email: email
        }
    });
    if (user.password == createHash("sha256").update(password + user.salt).digest("hex")) {
        const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: "8h"})
        return token;
    } else {
        throw new HttpError(400, "Incorrect credentials");
    }
}

userRouter.post("/login", json(), async (req:Request, res:Response) => {
    try {
        const {email, password} = req.body;
        const token = await login(email, password);
        res.status(200).json({ token: token }).end();
    } catch (e) {
        if ((e as Error).name == "PrismaClientKnownRequestError") {
            res.status(400).json({ error: "Incorrect credentials" }).end();
        } else {
            handleHttpError(e, res);
        }
    }
});

