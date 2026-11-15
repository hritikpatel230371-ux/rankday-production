import { AuthForm } from "@/components/auth-form";
import { appConfig } from "@/lib/config";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 premium-grid">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">R</div>
          <h1 className="text-3xl font-semibold">{appConfig.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your day is data. Your rank reflects progress.</p>
        </div>
        <AuthForm />
      </div>
    </main>
  );
}
