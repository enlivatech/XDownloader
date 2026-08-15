/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type {
  SerializedThreadConversation,
  SerializedThreadMedia,
  SerializedThreadTweet,
} from '#domain/serializers/threadConversationSerializer'

const CANVAS_WIDTH = 720
const PADDING = 32
const CONTENT_WIDTH = CANVAS_WIDTH - PADDING * 2
const AVATAR_SIZE = 44
const TIMELINE_AVATAR_SIZE = 36
const LINE_COLOR = '#38444d'
const TEXT_COLOR = '#e7e9ea'
const MUTED_COLOR = '#8899a6'
const ACCENT_COLOR = '#1d9bf0'
const CARD_BG = '#15202b'
const CARD_BORDER = '#38444d'
const IMAGE_GAP = 8
const MAX_IMAGE_WIDTH = CONTENT_WIDTH - TIMELINE_AVATAR_SIZE - 24

type LoadedImage = {
  media: SerializedThreadMedia
  image: HTMLImageElement
  width: number
  height: number
}

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
) => {
  const paragraphs = text.split('\n')
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }

    let currentLine = words[0] ?? ''
    for (const word of words.slice(1)) {
      const nextLine = `${currentLine} ${word}`
      if (ctx.measureText(nextLine).width <= maxWidth) {
        currentLine = nextLine
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    lines.push(currentLine)
  }

  return { lines, height: lines.length * lineHeight }
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    image.src = url
  })

const scaleImage = (width: number, height: number, maxWidth: number) => {
  if (width <= maxWidth) return { width, height }
  const ratio = maxWidth / width
  return {
    width: maxWidth,
    height: Math.round(height * ratio),
  }
}

const loadTweetImages = async (
  tweet: SerializedThreadTweet
): Promise<LoadedImage[]> => {
  const photoMedias = tweet.medias.filter(media => media.type === 'photo')
  const loaded: LoadedImage[] = []

  for (const media of photoMedias) {
    try {
      const image = await loadImage(media.url)
      const scaled = scaleImage(image.width, image.height, MAX_IMAGE_WIDTH)
      loaded.push({ media, image, ...scaled })
    } catch {
      // Skip images that fail CORS or network checks.
    }
  }

  return loaded
}

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const drawAvatar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  label: string,
  accent = false
) => {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = accent ? ACCENT_COLOR : '#22303c'
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${Math.round(size * 0.42)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label.slice(0, 1).toUpperCase(), x + size / 2, y + size / 2 + 1)
  ctx.restore()
}

const measureTweetBlock = async (
  ctx: CanvasRenderingContext2D,
  tweet: SerializedThreadTweet,
  options: {
    isRoot: boolean
    contentWidth: number
    avatarSize: number
  }
) => {
  const textWidth = options.contentWidth - options.avatarSize - 16
  const nameFont = options.isRoot ? '700 20px' : '700 16px'
  const bodyFont = options.isRoot ? '18px' : '16px'
  const lineHeight = options.isRoot ? 28 : 24

  ctx.font = `${bodyFont} -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  const wrapped = wrapText(ctx, tweet.content, textWidth, lineHeight)
  const images = await loadTweetImages(tweet)
  const imagesHeight = images.reduce(
    (total, item, index) => total + item.height + (index > 0 ? IMAGE_GAP : 0),
    0
  )

  const headerHeight = options.isRoot ? 52 : 44
  const blockHeight =
    Math.max(options.avatarSize, headerHeight + wrapped.height + imagesHeight) +
    (options.isRoot ? 24 : 20)

  return {
    wrapped,
    images,
    blockHeight,
    textWidth,
    nameFont,
    bodyFont,
    lineHeight,
  }
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export const renderThreadConversationToBlob = async (
  thread: SerializedThreadConversation
): Promise<Blob> => {
  const measureCtx = document.createElement('canvas').getContext('2d')
  if (!measureCtx) throw new Error('Canvas is not supported')

  const rootTweet = thread.tweets[0]
  if (!rootTweet) throw new Error('Thread is empty')

  const rootBlock = await measureTweetBlock(measureCtx, rootTweet, {
    isRoot: true,
    contentWidth: CONTENT_WIDTH,
    avatarSize: AVATAR_SIZE,
  })

  const replyBlocks = await Promise.all(
    thread.tweets.slice(1).map(tweet =>
      measureTweetBlock(measureCtx, tweet, {
        isRoot: false,
        contentWidth: CONTENT_WIDTH - 24,
        avatarSize: TIMELINE_AVATAR_SIZE,
      })
    )
  )

  const headerHeight = 72
  const footerHeight = 48
  const repliesHeight = replyBlocks.reduce(
    (total, block) => total + block.blockHeight,
    0
  )
  const canvasHeight =
    PADDING +
    headerHeight +
    rootBlock.blockHeight +
    (replyBlocks.length > 0 ? 36 : 0) +
    repliesHeight +
    footerHeight +
    PADDING

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported')

  ctx.fillStyle = CARD_BG
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let cursorY = PADDING

  ctx.fillStyle = TEXT_COLOR
  ctx.font =
    '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText('Thread', PADDING, cursorY + 24)
  ctx.fillStyle = MUTED_COLOR
  ctx.font =
    '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText(
    `${thread.tweets.length} post${thread.tweets.length > 1 ? 's' : ''}`,
    PADDING,
    cursorY + 48
  )
  cursorY += headerHeight

  drawRoundedRect(
    ctx,
    PADDING,
    cursorY,
    CONTENT_WIDTH,
    rootBlock.blockHeight,
    16
  )
  ctx.fillStyle = '#192734'
  ctx.fill()
  ctx.strokeStyle = CARD_BORDER
  ctx.lineWidth = 1
  ctx.stroke()

  const rootX = PADDING + 20
  const rootContentX = rootX + AVATAR_SIZE + 16
  drawAvatar(
    ctx,
    rootX,
    cursorY + 20,
    AVATAR_SIZE,
    rootTweet.user.displayName,
    true
  )

  ctx.fillStyle = TEXT_COLOR
  ctx.font = `${rootBlock.nameFont} -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.fillText(rootTweet.user.displayName, rootContentX, cursorY + 34)
  ctx.fillStyle = MUTED_COLOR
  ctx.font =
    '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText(
    `@${rootTweet.user.screenName} · ${formatDate(rootTweet.createdAt)}`,
    rootContentX,
    cursorY + 56
  )

  ctx.fillStyle = TEXT_COLOR
  ctx.font = `${rootBlock.bodyFont} -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  rootBlock.wrapped.lines.forEach((line, index) => {
    ctx.fillText(
      line,
      rootContentX,
      cursorY + 84 + index * rootBlock.lineHeight
    )
  })

  let mediaY =
    cursorY +
    84 +
    rootBlock.wrapped.lines.length * rootBlock.lineHeight +
    (rootBlock.images.length > 0 ? 12 : 0)

  for (const imageBlock of rootBlock.images) {
    drawRoundedRect(
      ctx,
      rootContentX,
      mediaY,
      imageBlock.width,
      imageBlock.height,
      12
    )
    ctx.save()
    ctx.clip()
    ctx.drawImage(
      imageBlock.image,
      rootContentX,
      mediaY,
      imageBlock.width,
      imageBlock.height
    )
    ctx.restore()
    mediaY += imageBlock.height + IMAGE_GAP
  }

  cursorY += rootBlock.blockHeight

  if (replyBlocks.length > 0) {
    cursorY += 24
    ctx.fillStyle = MUTED_COLOR
    ctx.font =
      '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText('THREAD TIMELINE', PADDING + 8, cursorY)
    cursorY += 20
  }

  replyBlocks.forEach((block, index) => {
    const tweet = thread.tweets[index + 1]
    if (!tweet) return

    const blockX = PADDING + 12
    const timelineX = blockX + 8
    const avatarX = blockX + 24
    const contentX = avatarX + TIMELINE_AVATAR_SIZE + 16

    if (index < replyBlocks.length) {
      ctx.strokeStyle = LINE_COLOR
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(timelineX, cursorY)
      ctx.lineTo(timelineX, cursorY + block.blockHeight)
      ctx.stroke()
    }

    drawAvatar(
      ctx,
      avatarX,
      cursorY + 8,
      TIMELINE_AVATAR_SIZE,
      tweet.user.displayName
    )

    ctx.fillStyle = TEXT_COLOR
    ctx.font = `${block.nameFont} -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.fillText(tweet.user.displayName, contentX, cursorY + 28)
    ctx.fillStyle = MUTED_COLOR
    ctx.font =
      '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(
      `@${tweet.user.screenName} · ${formatDate(tweet.createdAt)}`,
      contentX,
      cursorY + 48
    )

    ctx.fillStyle = TEXT_COLOR
    ctx.font = `${block.bodyFont} -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    block.wrapped.lines.forEach((line, lineIndex) => {
      ctx.fillText(line, contentX, cursorY + 72 + lineIndex * block.lineHeight)
    })

    let replyMediaY =
      cursorY +
      72 +
      block.wrapped.lines.length * block.lineHeight +
      (block.images.length > 0 ? 10 : 0)

    for (const imageBlock of block.images) {
      drawRoundedRect(
        ctx,
        contentX,
        replyMediaY,
        imageBlock.width,
        imageBlock.height,
        10
      )
      ctx.save()
      ctx.clip()
      ctx.drawImage(
        imageBlock.image,
        contentX,
        replyMediaY,
        imageBlock.width,
        imageBlock.height
      )
      ctx.restore()
      replyMediaY += imageBlock.height + IMAGE_GAP
    }

    cursorY += block.blockHeight
  })

  ctx.fillStyle = MUTED_COLOR
  ctx.font =
    '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText('Exported with Media Harvest', PADDING, canvasHeight - PADDING)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to export thread image'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

export const downloadThreadImageBlob = (
  blob: Blob,
  rootTweetId: string
): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `thread-${rootTweetId}.png`
  anchor.click()
  URL.revokeObjectURL(url)
}
