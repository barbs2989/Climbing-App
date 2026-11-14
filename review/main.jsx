// Entry for review.html — the owner's standalone Review desk (see review/ReviewDesk.jsx).
// Same origin as the app, so the app's stored sign-in (storageKey "climbmatch-auth") is reused:
// signing in on ClimbMatch signs you in here.
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/AuthContext.tsx";
import { setQueryClient } from "../lib/queryClientRef.js";
import ReviewDesk from "./ReviewDesk.jsx";

const qc = new QueryClient({ defaultOptions: { queries: { networkMode: "always", retry: 1, refetchOnWindowFocus: false, staleTime: 30000 } } });
// lib/db.js's write helpers refresh the queue through this ref after each approve / reject / resolve.
setQueryClient(qc);

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={qc}>
    <AuthProvider>
      <ReviewDesk />
    </AuthProvider>
  </QueryClientProvider>
);
