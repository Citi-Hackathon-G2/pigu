import * as functions from "firebase-functions";

export const register = functions
  .region("asia-southeast2")
  .https.onRequest((request, response) => {
    response.send("register called!!!!!!");
  });
