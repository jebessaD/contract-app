"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function ErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Authentication Error
        </h2>
        <div className="mt-2 text-center text-sm text-red-600">
          {error === "OAuthAccountNotLinked"
            ? "This email is already associated with another account. Please sign in with the original method you used to create your account."
            : error === "AccessDenied"
            ? "You do not have permission to sign in. Please check your Google account settings."
            : "An error occurred during sign in."}
        </div>
      </div>
    </div>
  );
} 