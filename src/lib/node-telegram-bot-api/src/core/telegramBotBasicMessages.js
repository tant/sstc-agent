const { stringify } = require('./base');

class TelegramBotBasicMessages {
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Send text message.
   * @param {Number|String} chatId Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * @param {String} text Text of the message to be sent
   * @param {Object} [options] Additional Telegram query options
   * @return {Promise} On success, the sent [Message](https://core.telegram.org/bots/api#message) object is returned
   * @see https://core.telegram.org/bots/api#sendmessage
   */
  sendMessage(chatId, text, form = {}) {
    form.chat_id = chatId;
    form.text = text;
    return this.bot._request('sendMessage', { form });
  }

  /**
   * Forward messages of any kind.
   * @param {Number|String} chatId Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * or username of the target channel (in the format `@channelusername`)
   * @param {Number|String} fromChatId Unique identifier for the chat where the
   * original message was sent (or channel username in the format `@channelusername`)
   * @param {Number|String} messageId  Unique message identifier in the chat specified in fromChatId
   * @param {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#forwardmessage
   */
  forwardMessage(chatId, fromChatId, messageId, form = {}) {
    form.chat_id = chatId;
    form.from_chat_id = fromChatId;
    form.message_id = messageId;
    return this.bot._request('forwardMessage', { form });
  }

  /**
   * Use this method to forward multiple messages of any kind.
   * If some of the specified messages can't be found or forwarded, they are skipped.
   *
   * @param {Number|String} chatId Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * or username of the target channel (in the format `@channelusername`)
   * @param {Number|String} fromChatId Unique identifier for the chat where the
   * original message was sent (or channel username in the format `@channelusername`)
   * @param {Array<Number|String>} messageIds Identifiers of 1-100 messages in the chat from_chat_id to forward.
   * The identifiers must be specified in a strictly increasing order.
   * @param {Object} [options] Additional Telegram query options
   * @return {Promise} An array of MessageId of the sent messages on success
   * @see https://core.telegram.org/bots/api#forwardmessages
   */
  forwardMessages(chatId, fromChatId, messageIds, form = {}) {
    form.chat_id = chatId;
    form.from_chat_id = fromChatId;
    form.message_ids = messageIds;
    return this.bot._request('forwardMessages', { form });
  }

  /**
   * Copy messages of any kind. **Service messages and invoice messages can't be copied.**
   * The method is analogous to the method forwardMessages, but the copied message doesn't
   * have a link to the original message.
   * Returns the MessageId of the sent message on success.
   * @param {Number|String} chatId     Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * @param {Number|String} fromChatId Unique identifier for the chat where the
   * original message was sent
   * @param {Number|String} messageId  Unique message identifier
   * @param {Object} [options] Additional Telegram query options
   * @return {Promise} The [MessageId](https://core.telegram.org/bots/api#messageid) of the sent message on success
   * @see https://core.telegram.org/bots/api#copymessage
   */
  copyMessage(chatId, fromChatId, messageId, form = {}) {
    form.chat_id = chatId;
    form.from_chat_id = fromChatId;
    form.message_id = messageId;
    return this.bot._request('copyMessage', { form });
  }

  /**
   * Use this method to copy messages of any kind. If some of the specified messages can't be found or copied, they are skipped.
   * Service messages, giveaway messages, giveaway winners messages, and invoice messages can't be copied.
   * Returns the MessageId of the sent message on success.
   * @param {Number|String} chatId Unique identifier for the target chat
   * @param {Number|String} fromChatId Unique identifier for the chat where the
   * original message was sent
   * @param {Array} messageIds  Identifiers of 1-100 messages in the chat from_chat_id to copy.
   * The identifiers must be specified in a strictly increasing order.
   * @param {Object} [options] Additional Telegram query options
   * @return {Promise} An array of MessageId of the sent messages
   * @see https://core.telegram.org/bots/api#copymessages
   */
  copyMessages(chatId, fromChatId, messageIds, form = {}) {
    form.chat_id = chatId;
    form.from_chat_id = fromChatId;
    form.message_ids = stringify(messageIds);
    return this.bot._request('copyMessages', { form });
  }
}

module.exports = TelegramBotBasicMessages;
