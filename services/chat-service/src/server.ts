import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const port = Number(process.env.PORT) || 3007;

app.listen(port, () => {
  console.log(`chat-service running on port ${port}`);
});
