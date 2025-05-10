import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("SignIn callback started:", { 
        user: { id: user.id, email: user.email },
        account: { provider: account?.provider, type: account?.type },
        profile: { email: profile?.email, sub: profile?.sub }
      });

      if (!profile?.email || !account) {
        console.error("Missing required data:", { profile, account });
        return false;
      }

      try {
        // First, ensure the user exists
        const dbUser = await prisma.user.upsert({
          where: { email: profile.email },
          update: {
            name: profile.name,
            image: profile.picture,
          },
          create: {
            email: profile.email,
            name: profile.name,
            image: profile.picture,
          },
        });

        console.log("User upsert result:", { id: dbUser.id, email: dbUser.email });

        // Then, ensure the OAuth account is created
        const oauthAccount = await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: profile.sub,
            },
          },
          update: {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
          },
          create: {
            userId: dbUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: profile.sub,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
          },
        });

        console.log("OAuth account created/updated:", { id: oauthAccount.id });

        // Check if Google account already exists
        const existingGoogleAccount = await prisma.googleAccount.findFirst({
          where: {
            userId: dbUser.id,
            email: profile.email,
          },
        });

        if (existingGoogleAccount) {
          // Update existing Google account
          const updatedAccount = await prisma.googleAccount.update({
            where: { id: existingGoogleAccount.id },
            data: {
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              scope: account.scope || "",
              tokenType: account.token_type || "Bearer",
              expiryDate: new Date(account.expires_at! * 1000),
            },
          });
          console.log("Updated existing Google account:", { id: updatedAccount.id });
        } else {
          // Create new Google account
          const newAccount = await prisma.googleAccount.create({
            data: {
              userId: dbUser.id,
              email: profile.email,
              googleId: profile.sub,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              scope: account.scope || "",
              tokenType: account.token_type || "Bearer",
              expiryDate: new Date(account.expires_at! * 1000),
              isPrimary: true,
            },
          });
          console.log("Created new Google account:", { id: newAccount.id });
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        if (error instanceof Error) {
          console.error("Error details:", error.message);
          console.error("Error stack:", error.stack);
        }
        return false;
      }
    },
    async session({ session, token }) {
      console.log("Session callback:", { 
        session: { user: session.user?.email },
        token: { sub: token.sub }
      });
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
    async jwt({ token, user }) {
      console.log("JWT callback:", { 
        token: { sub: token.sub },
        user: { id: user?.id, email: user?.email }
      });
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: true,
  events: {
    async signIn({ user, account, profile }) {
      console.log("Sign in event:", { 
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        accountId: account?.providerAccountId,
      });
    },
    async error(error) {
      console.error("Auth error event:", error);
    },
  },
}; 