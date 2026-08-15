/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ITwitterTokenRepository } from '#domain/repositories/twitterToken'
import type { AsyncUseCase } from '#domain/useCases/base'
import type {
  FetchTweetSolutionError,
  TransactionIdProvider,
} from '#domain/useCases/fetchTweetSolution'
import {
  InsufficientQuota,
  NoValidSolutionToken,
  TweetIsNotFound,
  TweetProcessingError,
} from '#domain/useCases/fetchTweetSolution'
import type { ThreadConversation } from '#domain/valueObjects/threadConversation'
import type { TweetInfo } from '#domain/valueObjects/tweetInfo'
import {
  FetchTweetError,
  LatestFetchTweetCommand,
  ParseTweetError,
} from '#libs/XApi'
import type { CommandCache } from '#libs/XApi/commands/types'
import { parseThreadConversationFromTweetDetail } from '#libs/XApi/parsers/threadConversation'
import { isErrorResult, isSuccessResult, toErrorResult } from '#utils/result'

type FetchThreadConversationInput = {
  tweetInfo: TweetInfo
  xTransactionIdProvider?: TransactionIdProvider
}

export type FetchThreadConversationInfra = {
  xTokenRepo: ITwitterTokenRepository
}

class CacheStorage implements CommandCache {
  constructor(readonly cache: Cache) {}

  get(request: Request): Promise<Response | undefined> {
    return this.cache.match(request)
  }

  put(request: Request, response: Response): Promise<void> {
    return this.cache.put(request, response)
  }
}

export class FetchThreadConversation implements AsyncUseCase<
  FetchThreadConversationInput,
  Result<ThreadConversation, FetchTweetSolutionError>
> {
  private cache: CacheStorage | undefined

  constructor(readonly infra: FetchThreadConversationInfra) {}

  private async getCacheStorage() {
    if (this.cache) return this.cache
    const cacheStorage = await caches.open('fetch-tweet')
    this.cache = new CacheStorage(cacheStorage)
    return this.cache
  }

  async process({
    tweetInfo,
    xTransactionIdProvider,
  }: FetchThreadConversationInput): Promise<
    Result<ThreadConversation, FetchTweetSolutionError>
  > {
    const csrfToken = await this.infra.xTokenRepo.getCsrfToken()
    if (!csrfToken) {
      return toErrorResult(new NoValidSolutionToken('Missing CSRF token'))
    }

    const command = new LatestFetchTweetCommand({
      tweetId: tweetInfo.tweetId,
      csrfToken: csrfToken.value,
      cacheProvider: () => this.getCacheStorage(),
      transactionIdProvider: async (path, method) => {
        if (!xTransactionIdProvider) return undefined

        const txIdResult = await xTransactionIdProvider(path, method)
        if (isErrorResult(txIdResult)) return undefined
        return txIdResult.value
      },
    })

    const request = await command.prepareRequest({
      protocol: 'https',
      hostname: 'x.com',
    })

    const cachedResponse = await command.readFromCache(request)
    const response =
      cachedResponse ??
      (await fetch(request, {
        signal: AbortSignal.timeout(10000),
      }))

    if (!cachedResponse && response.ok) {
      await command.putIntoCache(request, response.clone())
    }

    if (!response.ok) {
      if (response.status === 404) {
        return toErrorResult(new TweetIsNotFound('Failed to fetch thread'))
      }
      if (response.status === 429) {
        return toErrorResult(
          new InsufficientQuota('Failed to fetch thread', {
            isInternalControl: false,
          })
        )
      }

      return toErrorResult(
        new FetchTweetError('Failed to fetch thread', response.status)
      )
    }

    try {
      const body = await response.json()
      const threadResult = parseThreadConversationFromTweetDetail(
        body,
        tweetInfo.tweetId
      )

      if (!isSuccessResult(threadResult)) {
        const threadError = threadResult.error
        if (threadError instanceof ParseTweetError) {
          return toErrorResult(new TweetProcessingError(threadError.message))
        }

        return toErrorResult(
          new TweetProcessingError(
            threadError?.message ?? 'Failed to parse thread conversation'
          )
        )
      }

      return threadResult
    } catch (error) {
      return toErrorResult(
        new TweetProcessingError(
          error instanceof Error ? error.message : 'Failed to parse thread'
        )
      )
    }
  }
}
