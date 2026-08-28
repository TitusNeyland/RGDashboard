export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const failed = params.error === "1";
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary text-[13px] font-bold text-primary-foreground">
            RG
          </div>
          <span className="font-heading text-[15px] font-semibold tracking-tight">
            RG Pipeline
          </span>
        </div>

        <h1 className="font-heading text-[24px] font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          This dashboard contains real seller and deal data.
        </p>

        <form action="/api/login" method="POST" className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <input
            type="password"
            name="password"
            autoFocus
            required
            placeholder="Password"
            aria-label="Password"
            className="w-full rounded-lg border border-black/[0.12] bg-card px-3 py-2.5 text-[15px] outline-none focus:border-primary dark:border-white/15"
          />
          {failed && (
            <p className="text-[13px] text-red-600 dark:text-red-400">Incorrect password.</p>
          )}
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-2.5 text-[15px] font-medium text-primary-foreground"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
