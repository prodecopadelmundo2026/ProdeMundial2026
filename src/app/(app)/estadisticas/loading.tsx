export default function StatisticsLoading() {
  return (
    <div className="px-4 pb-24 pt-10 sm:px-5 sm:pt-14">
      <div className="mx-auto max-w-[1120px] animate-pulse">
        <header className="mb-10 sm:mb-14">
          <div className="h-3 w-44 rounded bg-white/10" />
          <div className="mt-5 h-20 w-full max-w-[760px] rounded bg-orange/20 sm:h-24" />
          <div className="mt-5 h-4 w-full max-w-[620px] rounded bg-white/10" />
          <div className="mt-3 h-4 w-2/3 max-w-[420px] rounded bg-white/10" />
        </header>
        <div className="h-10 w-64 rounded bg-white/10" />
        <div className="mt-5 grid grid-cols-1 gap-2 rounded-[18px] border border-white/10 bg-[#111] p-3 min-[430px]:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-10 rounded-xl bg-white/10" />
          ))}
        </div>
        <div className="mt-4 h-[360px] rounded-[20px] border border-white/10 bg-[#0e0e0e]" />
      </div>
    </div>
  )
}
