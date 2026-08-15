/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ThreadConversation } from '#domain/valueObjects/threadConversation'
import type { TweetMedia } from '#domain/valueObjects/tweetMedia'
import type { TweetWithContent } from '#domain/valueObjects/tweetWithContent'

export type SerializedThreadMedia = {
  url: string
  type: 'photo' | 'video' | 'thumbnail'
}

export type SerializedThreadTweet = {
  id: string
  content: string
  createdAt: string
  user: {
    displayName: string
    screenName: string
  }
  medias: SerializedThreadMedia[]
}

export type SerializedThreadConversation = {
  rootTweetId: string
  tweets: SerializedThreadTweet[]
}

const serializeMedia = (media: TweetMedia): SerializedThreadMedia => ({
  url: media.getVariantUrl('orig'),
  type: media.mapBy(props => props.type),
})

const serializeTweet = (tweet: TweetWithContent): SerializedThreadTweet => ({
  id: tweet.id,
  content: tweet.content,
  createdAt: tweet.tweet.mapBy(props => props.createdAt.toISOString()),
  user: {
    displayName: tweet.tweet.user.mapBy(props => props.displayName),
    screenName: tweet.tweet.user.mapBy(props => props.screenName),
  },
  medias: tweet.tweet.availableMedias
    .filter(media => !media.isThumbnail)
    .map(serializeMedia),
})

export const serializeThreadConversation = (
  thread: ThreadConversation
): SerializedThreadConversation => ({
  rootTweetId: thread.rootTweetId,
  tweets: thread.tweets.map(serializeTweet),
})
