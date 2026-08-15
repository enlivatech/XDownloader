/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { SerializedThreadConversation } from '#domain/serializers/threadConversationSerializer'
import { toErrorResult, toSuccessResult } from '#utils/result'
import {
  WebExtAction,
  WebExtMessage,
  WebExtMessageErrorResponse,
  WebExtMessagePayloadObject,
  WebExtMessagePayloadResponse,
} from './base'
import Joi from 'joi'

type ExportThreadImageMessagePayload = {
  tweetId: string
  screenName: string
}

const messageSchema: Joi.ObjectSchema<
  WebExtMessagePayloadObject<
    WebExtAction.ExportThreadImage,
    ExportThreadImageMessagePayload
  >
> = Joi.object({
  action: Joi.valid(WebExtAction.ExportThreadImage).required(),
  payload: Joi.object({
    tweetId: Joi.string().required(),
    screenName: Joi.string().required(),
  }).required(),
})

export class ExportThreadImageMessage implements WebExtMessage<
  WebExtAction.ExportThreadImage,
  ExportThreadImageMessagePayload,
  SerializedThreadConversation
> {
  constructor(readonly payload: ExportThreadImageMessagePayload) {}

  static validate(message: unknown): Result<ExportThreadImageMessage> {
    const { value, error } = messageSchema.validate(message)
    return error
      ? toErrorResult(error)
      : toSuccessResult(new ExportThreadImageMessage(value.payload))
  }

  makeResponse(
    isOk: true,
    payload: SerializedThreadConversation
  ): WebExtMessagePayloadResponse<SerializedThreadConversation>
  makeResponse(isOk: false, reason: string): WebExtMessageErrorResponse
  makeResponse(
    ...args: [true, SerializedThreadConversation] | [false, string]
  ):
    | WebExtMessagePayloadResponse<SerializedThreadConversation>
    | WebExtMessageErrorResponse {
    const [isOk, payload] = args
    return isOk
      ? { status: 'ok', payload }
      : { status: 'error', reason: payload }
  }

  toObject(): WebExtMessagePayloadObject<
    WebExtAction.ExportThreadImage,
    ExportThreadImageMessagePayload
  > {
    return {
      action: WebExtAction.ExportThreadImage,
      payload: this.payload,
    }
  }
}
