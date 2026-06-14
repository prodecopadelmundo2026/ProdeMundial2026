export default function Loading() {
  return (
    <div className="page-loader mx-auto w-full max-w-[1180px] px-4 py-8">
      <div className="mb-6 h-2 w-40 rounded-full bg-white/10" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="loading-panel h-[180px] rounded-[20px]" />
        </div>
        <div className="loading-panel h-[180px] rounded-[20px]" />
      </div>
      <div className="mt-5 grid gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="loading-panel h-[72px] rounded-[16px]" />
        ))}
      </div>
    </div>
  )
}
