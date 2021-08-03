import * as functions from "firebase-functions";

export const transferVoucher = functions
  .region("asia-southeast2")
  .https.onCall((data, context) => {
    // ...
    return {
      msg: "transfer called",
    };
  });
