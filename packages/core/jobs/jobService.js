import prisma from "@acme/db";
export class JobService {
    constructor(db = prisma) {
        this.db = db;
    }
}