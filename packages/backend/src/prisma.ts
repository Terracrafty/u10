import { PrismaClient } from "../../../generated/prisma/client";
import { createSoftDeleteExtension } from "prisma-extension-soft-delete"

export const prisma = new PrismaClient().$extends(
    createSoftDeleteExtension({
        models: {
            User: true,
            Post: true,
            Tag: true,
            MessageHistory: true,
            Message: true,
        },
    })
);