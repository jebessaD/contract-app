"use client";

import { signIn, useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated" && session) {
      console.log("User authenticated, redirecting to:", callbackUrl);
      router.push(callbackUrl);
    }
  }, [status, session, callbackUrl, router]);

  useEffect(() => {
    if (error) {
      console.error("Sign in error:", {
        error,
        callbackUrl,
        searchParams: Object.fromEntries(searchParams.entries()),
      });
    }
  }, [error, callbackUrl, searchParams]);

  const handleSignIn = async () => {
    try {
      console.log("Attempting sign in with Google...");
      const result = await signIn("google", {
        callbackUrl,
        redirect: true,
      });
      console.log("Sign in result:", result);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        {error && (
          <div className="mt-2 text-center text-sm text-red-600">
            {error === "OAuthAccountNotLinked"
              ? "This email is already associated with another account. Please sign in with the original method you used to create your account."
              : error === "AccessDenied"
              ? "You do not have permission to sign in. Please check your Google account settings."
              : "An error occurred during sign in."}
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <button
            onClick={handleSignIn}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
} 