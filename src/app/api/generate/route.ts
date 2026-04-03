// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession, FREE_LIMIT } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSTLBuffer, resampleGrayscale, RESOLUTION_SIZES } from '@/lib/stl-generator'
import sharp from 'sharp'

export const maxDuration = 60 // seconds

export async function POST(req: NextRequest) {
  // Auth check
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Fetch user & check usage
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, usageCount: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.usageCount >= FREE_LIMIT)
    return NextResponse.json(
      { error: `You have used all ${FREE_LIMIT}/${FREE_LIMIT} free generations. Please upgrade.` },
      { status: 403 }
    )

  // Parse form data
  let formData: FormData
  try { formData = await req.formData() } 
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }) }

  const imageFile = formData.get('image') as File | null
  if (!imageFile) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const resolution = (formData.get('resolution') as string) || 'medium'
  const heightScale = parseFloat((formData.get('heightScale') as string) || '2')
  const inverted = formData.get('inverted') === 'true'

  if (!['low', 'medium', 'high'].includes(resolution)) return NextResponse.json({ error: 'Invalid resolution' }, { status: 400 })
  if (isNaN(heightScale) || heightScale < 0.5 || heightScale > 5) return NextResponse.json({ error: 'Invalid height scale (0.5–5.0)' }, { status: 400 })

  // Process image
  let grayscalePixels: Float32Array, srcWidth: number, srcHeight: number
  try {
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const { data, info } = await sharp(imageBuffer).grayscale().raw().toBuffer({ resolveWithObject: true })
    srcWidth = info.width; srcHeight = info.height
    grayscalePixels = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) grayscalePixels[i] = data[i] / 255
  } catch (err) {
    console.error('[generate] image processing error:', err)
    return NextResponse.json({ error: 'Failed to process image. Ensure it is a valid PNG/JPG/WebP.' }, { status: 422 })
  }

  // Resample
  const targetSize = RESOLUTION_SIZES[resolution as keyof typeof RESOLUTION_SIZES]
  const resampled = resampleGrayscale(grayscalePixels, srcWidth, srcHeight, targetSize.width, targetSize.height)

  // Generate STL
  let stlBuffer: Buffer
  try { stlBuffer = generateSTLBuffer(resampled, targetSize.width, targetSize.height, { resolution: resolution as 'low'|'medium'|'high', heightScale, inverted }) }
  catch (err) { 
    console.error('[generate] STL generation error:', err)
    return NextResponse.json({ error: 'STL generation failed' }, { status: 500 })
  }

  // Update DB
  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { usageCount: { increment: 1 } } }),
      prisma.generation.create({ data: { userId: user.id, filename: imageFile.name, resolution, heightScale, inverted } })
    ])
  } catch (err) { console.error('[generate] DB update error:', err) }

  // Return STL
  const uint8Body = new Uint8Array(stlBuffer) 

return new NextResponse(uint8Body, {
  status: 200,
  headers: {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="relief_${resolution}_${Date.now()}.stl"`,
    'Content-Length': String(stlBuffer.length),
  },
})

}
