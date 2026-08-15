/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ValueObject } from './base'
import { TweetWithContent } from './tweetWithContent'

export type ThreadConversationProps = {
  rootTweetId: string
  tweets: TweetWithContent[]
}

export class ThreadConversation extends ValueObject<ThreadConversationProps> {
  get rootTweetId() {
    return this.props.rootTweetId
  }

  get tweets() {
    return this.props.tweets
  }

  get rootTweet() {
    return this.props.tweets[0]
  }

  static create(props: ThreadConversationProps) {
    return new ThreadConversation(props)
  }
}
