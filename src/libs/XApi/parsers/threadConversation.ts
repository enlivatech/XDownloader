/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ThreadConversation } from '#domain/valueObjects/threadConversation'
import { TweetWithContent } from '#domain/valueObjects/tweetWithContent'
import { toErrorResult, toSuccessResult } from '#utils/result'
import { ParseTweetError } from '../commands/abstractFetchTweet'
import { Instruction, isTweetDetailBody } from './refinements'
import { parseTweet, retrieveTweetsFromInstruction } from './tweet'

type TweetMeta = {
  parsed: TweetWithContent
  inReplyToStatusId?: string
  userId: string
}

const extractTweetMeta = (
  tweetResult: XApi.TweetLike | XApi.Tweet
): TweetMeta => ({
  parsed: parseTweet(tweetResult),
  inReplyToStatusId:
    typeof tweetResult.legacy.in_reply_to_status_id_str === 'string'
      ? tweetResult.legacy.in_reply_to_status_id_str
      : undefined,
  userId: tweetResult.legacy.user_id_str,
})

const buildAuthorThread = (
  metas: TweetMeta[],
  focalTweetId: string
): TweetWithContent[] => {
  const focalMeta = metas.find(meta => meta.parsed.id === focalTweetId)
  if (!focalMeta) return []

  const authorId = focalMeta.userId
  const authorMetas = metas.filter(meta => meta.userId === authorId)

  let root = focalMeta
  while (root.inReplyToStatusId) {
    const parent = authorMetas.find(
      meta => meta.parsed.id === root.inReplyToStatusId
    )
    if (!parent) break
    root = parent
  }

  const chain: TweetMeta[] = [root]
  let expanded = true

  while (expanded) {
    expanded = false
    for (const meta of authorMetas) {
      if (chain.some(item => item.parsed.id === meta.parsed.id)) continue
      if (
        meta.inReplyToStatusId &&
        chain.some(item => item.parsed.id === meta.inReplyToStatusId)
      ) {
        chain.push(meta)
        expanded = true
      }
    }
  }

  return chain
    .sort(
      (left, right) =>
        left.parsed.tweet.mapBy(props => props.createdAt.getTime()) -
        right.parsed.tweet.mapBy(props => props.createdAt.getTime())
    )
    .map(meta => meta.parsed)
}

export const parseThreadConversationFromTweetDetail = (
  body: unknown,
  focalTweetId: string
): Result<ThreadConversation> => {
  if (!isTweetDetailBody(body)) {
    return toErrorResult(new ParseTweetError('Invalid body'))
  }

  const [addEntriesInstruction] =
    body.data.threaded_conversation_with_injections_v2.instructions.filter(
      Instruction.isTimelineAddEntries
    )

  if (!addEntriesInstruction) {
    return toErrorResult(new ParseTweetError('Invalid instructions'))
  }

  const rawTweets = retrieveTweetsFromInstruction(addEntriesInstruction)
  const metas = rawTweets.map(extractTweetMeta)
  const tweets = buildAuthorThread(metas, focalTweetId)

  if (tweets.length === 0) {
    return toErrorResult(
      new ParseTweetError(`Cannot find focal tweet. (tweetId: ${focalTweetId})`)
    )
  }

  return toSuccessResult(
    ThreadConversation.create({
      rootTweetId: tweets[0].id,
      tweets,
    })
  )
}
