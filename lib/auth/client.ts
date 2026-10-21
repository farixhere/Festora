"use client";

import { createAuthClient } from "better-auth/react";

// No baseURL: the client talks to the same origin (/api/auth/*), which works
// for production, preview deployments and localhost alike.
export const authClient = createAuthClient();
