import express from "express";

const app = express();

import routes from "./routes/index.js";
app.use(`/${process.env.NODE_ENV == 'development' ? 'api' : ''}`, routes);

app.use(express.json());

export default app;