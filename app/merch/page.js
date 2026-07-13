'use client'

export default function MerchPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <a href="/" className="text-violet-400 hover:text-violet-300 text-sm font-medium">
          &larr; Back to Franchises
        </a>

        <div className="flex flex-col items-center justify-center text-center py-24">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 max-w-md">
            <h1 className="text-2xl font-bold mb-2">Roster HQ Merch</h1>
            <p className="text-neutral-400 text-sm mb-4">
              Coming soon. Gear for your franchise, your way.
            </p>
            <span className="inline-block bg-violet-900/40 text-violet-400 text-xs font-semibold px-3 py-1 rounded-full">
              In the works
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}