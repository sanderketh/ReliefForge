// src/components/DashboardClient.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string | null
  usageCount: number
  freeLimit: number
}

interface Props {
  user: User
}

type Resolution = 'low' | 'medium' | 'high'
type Status = 'idle' | 'uploading' | 'generating' | 'done' | 'error'

export default function DashboardClient({ user }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [resolution, setResolution] = useState<Resolution>('medium')
  const [heightScale, setHeightScale] = useState(2)
  const [inverted, setInverted] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('relief.stl')
  const [usageCount, setUsageCount] = useState(user.usageCount)
  const [isDragging, setIsDragging] = useState(false)

  const remaining = user.freeLimit - usageCount
  const isBlocked = remaining <= 0

  const handleFile = (f: File) => {
    if (!f.type.match(/image\/(png|jpg|jpeg|webp)/)) {
      setError('Please upload a PNG, JPG, or WebP image.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.')
      return
    }
    setError('')
    setFile(f)
    setDownloadUrl(null)
    setStatus('idle')
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }, [])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  async function handleGenerate() {
    if (!file || isBlocked) return
    setError('')
    setDownloadUrl(null)
    setStatus('uploading')

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('resolution', resolution)
      formData.append('heightScale', String(heightScale))
      formData.append('inverted', String(inverted))

      setStatus('generating')

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const filename = `relief_${resolution}_${Date.now()}.stl`

      setDownloadUrl(url)
      setDownloadFilename(filename)
      setUsageCount(prev => prev + 1)
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const usagePercent = (usageCount / user.freeLimit) * 100

  return (
    <div className="min-h-screen bg-forge-pattern">
      {/* Nav */}
      <nav className="border-b border-stone-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forge-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-none stroke-current stroke-2">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/>
              </svg>
            </div>
            <span className="font-display font-bold text-lg text-stone-100">ReliefForge</span>
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden sm:block text-right">
              <div className="text-stone-400 text-xs">{user.email}</div>
              <div className={`text-xs font-mono font-bold ${remaining <= 1 ? 'text-red-400' : 'text-forge-400'}`}>
                {usageCount}/{user.freeLimit} generations used
              </div>
            </div>
            <button onClick={handleLogout} className="btn-ghost text-sm px-4 py-2">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Top Ad */}
        <div className="ad-placeholder w-full h-16 mb-8">
          <span>Ad Space — 728×90 Leaderboard</span>
        </div>

        {/* Usage bar */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-stone-300 text-sm font-medium">Free generations</span>
            <span className={`font-mono text-sm font-bold ${remaining <= 1 ? 'text-red-400' : remaining <= 2 ? 'text-yellow-400' : 'text-forge-400'}`}>
              {usageCount} / {user.freeLimit} used
            </span>
          </div>
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercent >= 100 ? 'bg-red-500' :
                usagePercent >= 66 ? 'bg-yellow-500' : 'bg-forge-500'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          {isBlocked && (
            <p className="text-red-400 text-sm mt-3 font-medium">
              ✗ You have used all {user.freeLimit}/{user.freeLimit} free generations. Upgrade to continue.
            </p>
          )}
          {!isBlocked && (
            <p className="text-stone-500 text-xs mt-2">
              {remaining} generation{remaining !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left column: Upload + Options */}
          <div className="lg:col-span-3 space-y-6">

            {/* Upload zone */}
            <div className="card-glow bg-stone-900/60 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-stone-100 mb-5">
                Upload Image
              </h2>

              <div
                className={`relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
                  ${isDragging
                    ? 'border-forge-500 bg-forge-950/30'
                    : preview
                    ? 'border-stone-600 bg-stone-900/30'
                    : 'border-stone-700 hover:border-stone-500 bg-stone-900/30'
                  }`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onFileChange}
                  className="hidden"
                />

                {preview ? (
                  <div className="p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full max-h-64 object-contain rounded-lg"
                    />
                    <p className="text-center text-stone-500 text-xs mt-3">
                      {file?.name} — click to change
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                    <div className="w-16 h-16 bg-stone-800 rounded-2xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <p className="text-stone-300 font-medium mb-1">Drop image here or click to browse</p>
                    <p className="text-stone-600 text-sm">PNG, JPG, WebP · max 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Options panel */}
            <div className="card-glow bg-stone-900/60 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-stone-100 mb-5">
                Generation Options
              </h2>

              <div className="space-y-6">
                {/* Resolution */}
                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-3">
                    Resolution
                    <span className="text-stone-500 font-normal ml-2">
                      {resolution === 'low' ? '(50×50 grid — fast)' : resolution === 'medium' ? '(100×100 grid)' : '(200×200 grid — detailed)'}
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as Resolution[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setResolution(r)}
                        className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-150 capitalize
                          ${resolution === r
                            ? 'bg-forge-600 text-white shadow-lg shadow-forge-900/50'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                          }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Height scale */}
                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-3">
                    Height Scale
                    <span className="text-forge-400 font-mono ml-2">{heightScale.toFixed(1)}×</span>
                  </label>
                  <input
                    type="range"
                    min={0.5}
                    max={5}
                    step={0.5}
                    value={heightScale}
                    onChange={e => setHeightScale(Number(e.target.value))}
                    className="w-full accent-forge-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-stone-600 text-xs mt-1">
                    <span>0.5× (shallow)</span>
                    <span>5.0× (deep)</span>
                  </div>
                </div>

                {/* Invert toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-stone-300 text-sm font-medium">Invert depth</div>
                    <div className="text-stone-500 text-xs mt-0.5">Dark areas become raised instead of recessed</div>
                  </div>
                  <button
                    onClick={() => setInverted(!inverted)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200
                      ${inverted ? 'bg-forge-600' : 'bg-stone-700'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
                      ${inverted ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Side Ad */}
            <div className="ad-placeholder h-24 w-full rounded-xl">
              <span>Ad Space — 300×100 Rectangle</span>
            </div>
          </div>

          {/* Right column: Generate + Result */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-glow bg-stone-900/60 rounded-2xl p-6 sticky top-6">
              <h2 className="font-display text-xl font-semibold text-stone-100 mb-5">
                Generate STL
              </h2>

              {/* Summary */}
              <div className="bg-stone-800/50 rounded-xl p-4 mb-5 space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Image</span>
                  <span className="text-stone-300 truncate max-w-32">{file?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Resolution</span>
                  <span className="text-forge-400 capitalize">{resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Height</span>
                  <span className="text-forge-400">{heightScale}×</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Inverted</span>
                  <span className="text-forge-400">{inverted ? 'Yes' : 'No'}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!file || isBlocked || status === 'generating' || status === 'uploading'}
                className="btn-forge w-full text-base py-4 mb-4"
              >
                {status === 'uploading' || status === 'generating' ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {status === 'uploading' ? 'Processing image…' : 'Generating STL…'}
                  </span>
                ) : isBlocked ? (
                  '✗ Limit reached'
                ) : !file ? (
                  'Upload an image first'
                ) : (
                  '⬡ Generate STL →'
                )}
              </button>

              {/* Download result */}
              {status === 'done' && downloadUrl && (
                <div className="border border-green-700/40 bg-green-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    STL generated successfully!
                  </div>
                  <a
                    href={downloadUrl}
                    download={downloadFilename}
                    className="flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-600 text-white rounded-lg py-3 text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Download {downloadFilename}
                  </a>
                  <p className="text-stone-500 text-xs mt-2 text-center">
                    Open in any slicer (Cura, PrusaSlicer, etc.)
                  </p>
                </div>
              )}

              {/* Hint text */}
              {status === 'idle' && !file && (
                <p className="text-stone-600 text-xs text-center">
                  Upload an image, choose settings, and click Generate.
                </p>
              )}
            </div>

            {/* Side Ad */}
            <div className="ad-placeholder h-60 w-full rounded-xl flex-col gap-2">
              <span>Ad Space</span>
              <span className="text-xs">300×250 Rectangle</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
