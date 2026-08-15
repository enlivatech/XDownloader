/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { parseThreadConversationFromTweetDetail } from './threadConversation'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('parseThreadConversationFromTweetDetail', () => {
  const fixture = JSON.parse(
    readFileSync(
      resolve(__dirname, '../../../test-data/TweetDetail.json'),
      'utf8'
    )
  )['tagged-video']

  it('should parse the focal tweet as a single-tweet thread', () => {
    const result = parseThreadConversationFromTweetDetail(
      fixture,
      '1829835601941823508'
    )

    expect(result.error).toBeUndefined()
    expect(result.value?.rootTweetId).toBe('1829835601941823508')
    expect(result.value?.tweets).toHaveLength(1)
    expect(result.value?.tweets[0]?.content).toContain('#今月描いた絵を晒そう')
  })

  it('should return error when focal tweet is missing', () => {
    const result = parseThreadConversationFromTweetDetail(
      fixture,
      'missing-tweet-id'
    )

    expect(result.value).toBeUndefined()
    expect(result.error?.message).toContain('Cannot find focal tweet')
  })
})
