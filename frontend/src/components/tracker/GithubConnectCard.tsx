"use client";

type GithubConnectCardProps = {
  githubUsername: string | null;
  linking: boolean;
  onConnect: () => Promise<void>;
  message?: string;
};

export default function GithubConnectCard({
  githubUsername,
  linking,
  onConnect,
  message = "",
}: GithubConnectCardProps) {
  const isLinked = Boolean(String(githubUsername || "").trim());

  return (
    <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_30px_rgba(42,74,128,0.12)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">GitHub Account Link</h3>
          <p className="text-xs text-slate-500">Link your GitHub account so webhook commits can map to your tracker score.</p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isLinked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {isLinked ? "Linked" : "Not Linked"}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {isLinked ? (
          <p>
            Linked username: <span className="font-semibold">{githubUsername}</span>
          </p>
        ) : (
          <p>No GitHub username is linked yet.</p>
        )}
      </div>

      {message ? (
        <p className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">{message}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void onConnect()}
        disabled={linking}
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {linking ? "Redirecting to GitHub..." : isLinked ? "Relink GitHub" : "Connect with GitHub"}
      </button>
    </section>
  );
}
