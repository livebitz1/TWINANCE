import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Exclude static files, API routes, and sign-in/sign-up routes
    "/((?!.*\\..*|_next|sign-in|sign-up|api).*)",
    "/"
  ],
};
