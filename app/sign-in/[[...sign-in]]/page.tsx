import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Sign In to Twinance</h1>
          <p className="auth-subtitle">Welcome back! Sign in to your account</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: "btn btn-primary",
              card: "",
              rootBox: "w-full",
            },
          }}
          routing="path"
          path="/sign-in"
        />
      </div>
    </div>
  );
}
