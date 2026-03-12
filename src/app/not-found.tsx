import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      {/* Elevator floor indicator */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-20 w-16 items-center justify-center rounded-lg border border-gold/30 bg-charcoal">
          <span className="font-data text-2xl text-gold">?</span>
        </div>
        <div className="h-6 w-px bg-gold/20" />
      </div>

      <h1 className="font-heading text-3xl font-bold text-ivory sm:text-4xl">
        This floor doesn&apos;t exist
      </h1>

      <p className="mt-3 max-w-md text-base text-parchment">
        The page you&apos;re looking for couldn&apos;t be found. It may have
        been moved or removed.
      </p>

      <div className="mt-2 font-data text-xs text-slate">404</div>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg border border-gold bg-transparent px-6 py-3 text-sm font-medium uppercase tracking-wider text-gold transition-colors hover:bg-gold hover:text-boardroom"
      >
        Return to the lobby
      </Link>

      {/* Bottom decorative divider */}
      <div className="mt-10 h-px w-12 bg-gold/40" />
    </div>
  );
}
