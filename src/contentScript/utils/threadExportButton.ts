/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ExportThreadImageMessage, sendMessage } from '#libs/webExtMessage'
import { getTweetInfoFromArticleChildElement } from './article'
import {
  downloadThreadImageBlob,
  renderThreadConversationToBlob,
} from './threadImageRenderer'

type ButtonElement = HTMLElement

export const enum ThreadExportStatus {
  Exporting = 'exporting',
  Success = 'success',
  Error = 'error',
}

const cleanButtonStatus = (button: HTMLElement) => {
  button.classList.remove(
    ThreadExportStatus.Exporting,
    ThreadExportStatus.Success,
    ThreadExportStatus.Error
  )
  return button
}

const setButtonStatus =
  (status: ThreadExportStatus) => (button: ButtonElement) => {
    cleanButtonStatus(button)
    button.classList.add(status)
    return button
  }

const isExportingButton = (button: ButtonElement) =>
  button.classList.contains(ThreadExportStatus.Exporting)

const buttonClickHandler = (event: MouseEvent) => {
  event.stopImmediatePropagation()
  const target = event.target
  if (!(target instanceof Element)) return

  const button = target.closest<HTMLElement>('.thread-exporter')
  if (!button) return
  if (isExportingButton(button)) return

  setButtonStatus(ThreadExportStatus.Exporting)(button)

  const { value, error } = getTweetInfoFromArticleChildElement(button)
  if (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    setButtonStatus(ThreadExportStatus.Error)(button)
    return
  }

  const message = new ExportThreadImageMessage(value.mapBy(props => props))
  sendMessage(message)
    .then(async response => {
      if (response.status === 'error') {
        setButtonStatus(ThreadExportStatus.Error)(button)
        return
      }

      try {
        const blob = await renderThreadConversationToBlob(response.payload)
        downloadThreadImageBlob(blob, response.payload.rootTweetId)
        setButtonStatus(ThreadExportStatus.Success)(button)
      } catch (exportError) {
        // eslint-disable-next-line no-console
        console.error(exportError)
        setButtonStatus(ThreadExportStatus.Error)(button)
      }
    })
    .catch(exportError => {
      // eslint-disable-next-line no-console
      console.error(exportError)
      setButtonStatus(ThreadExportStatus.Error)(button)
    })
}

export const makeThreadExportListener = <T extends ButtonElement>(
  button: T
): T => {
  button.addEventListener('click', buttonClickHandler)
  return button
}
