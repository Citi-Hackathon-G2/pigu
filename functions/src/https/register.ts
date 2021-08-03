import * as functions from "firebase-functions";
import * as cors from "cors";

import { User } from "../schema/user";
import { fs, auth } from "../utils/admin";

type RegisterRequest = {
  username?: string | undefined;
  email?: string | undefined;
  password?: string | undefined;
};

type ErrorResponse = {
  code: functions.https.FunctionsErrorCode;
  message: string;
  details?: unknown;
};

const corsHandler = cors({ origin: true });

export const register = functions.region("asia-southeast2").https.onRequest(
  async (request, response): Promise<void> =>
    corsHandler(request, response, async () => {
      const { username, email, password }: RegisterRequest = request.body;

      // check required data is present
      if (!username || !email || !password) {
        response.status(400).json({
          code: "invalid-argument",
          message: "All fields must be prsent: username, email, and password.",
        } as ErrorResponse);
        return;
      }

      // check if username already exists
      const userSnapshot = await fs
        .collection("user")
        .where("username", "==", username)
        .get();
      if (!userSnapshot.empty) {
        response.status(400).json({
          code: "already-exists",
          message: "The username is already in use by another account.",
        } as ErrorResponse);
        return;
      }

      try {
        // create the auth user
        const userCreated = await auth.createUser({
          email: email,
          password: password,
        });

        // create the fs user doc
        const userDoc: User = {
          username: username,
          email: email,
          vouchers: [],
          shops: [],
        };
        await fs.collection("user").doc(userCreated.uid).set(userDoc);

        response.status(204).send();
      } catch (err) {
        // errors if any
        response.status(400).json(err as ErrorResponse);
      }
    })
);
