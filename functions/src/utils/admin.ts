import * as admin from "firebase-admin";

admin.initializeApp();

export const fs = admin.firestore();
export const auth = admin.auth();
