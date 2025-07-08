import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">Join Twinance today to get started</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: "btn btn-primary",
              card: "",
              rootBox: "w-full",
            },
          }}
          routing="path"
          path="/sign-up"
        />
      </div>
    </div>
  );
}
