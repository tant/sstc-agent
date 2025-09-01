const { debug } = require('./base');

class TelegramBotMessages {
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Process an update; emitting the proper events and executing regexp
   * callbacks. This method is useful should you be using a different
   * way to fetch updates, other than those provided by TelegramBot.
   *
   * @param {Object} update
   * @see https://core.telegram.org/bots/api#update
   */
  processUpdate(update) {
    debug('Process Update %j', update);
    const message = update.message;
    const editedMessage = update.edited_message;
    const channelPost = update.channel_post;
    const editedChannelPost = update.edited_channel_post;
    const businessConnection = update.business_connection;
    const businesssMessage = update.business_message;
    const editedBusinessMessage = update.edited_business_message;
    const deletedBusinessMessage = update.deleted_business_messages;
    const messageReaction = update.message_reaction;
    const messageReactionCount = update.message_reaction_count;
    const inlineQuery = update.inline_query;
    const chosenInlineResult = update.chosen_inline_result;
    const callbackQuery = update.callback_query;
    const shippingQuery = update.shipping_query;
    const preCheckoutQuery = update.pre_checkout_query;
    const purchasedPaidMedia = update.purchased_paid_media;
    const poll = update.poll;
    const pollAnswer = update.poll_answer;
    const myChatMember = update.my_chat_member;
    const chatMember = update.chat_member;
    const chatJoinRequest = update.chat_join_request;
    const chatBoost = update.chat_boost;
    const removedChatBoost = update.removed_chat_boost;

    if (message) {
      debug('Process Update message %j', message);
      const metadata = {};
      metadata.type = this.bot.constructor.messageTypes.find((messageType) => message[messageType]);
      this.bot.emit('message', message, metadata);
      if (metadata.type) {
        debug('Emitting %s: %j', metadata.type, message);
        this.bot.emit(metadata.type, message, metadata);
      }
      if (message.text) {
        debug('Text message');
        this.bot._textRegexpCallbacks.some((reg) => {
          debug('Matching %s with %s', message.text, reg.regexp);

          if (!(reg.regexp instanceof RegExp)) {
            reg.regexp = new RegExp(reg.regexp);
          }

          const result = reg.regexp.exec(message.text);
          if (!result) {
            return false;
          }
          // reset index so we start at the beginning of the regex each time
          reg.regexp.lastIndex = 0;
          debug('Matches %s', reg.regexp);
          reg.callback(message, result);
          // returning truthy value exits .some
          return this.bot.options.onlyFirstMatch;
        });
      }
      if (message.reply_to_message) {
        // Only callbacks waiting for this message
        this.bot._replyListeners.forEach((reply) => {
          // Message from the same chat
          if (reply.chatId === message.chat.id) {
            // Responding to that message
            if (reply.messageId === message.reply_to_message.message_id) {
              // Resolve the promise
              reply.callback(message);
            }
          }
        });
      }
    } else if (editedMessage) {
      debug('Process Update edited_message %j', editedMessage);
      this.bot.emit('edited_message', editedMessage);
      if (editedMessage.text) {
        this.bot.emit('edited_message_text', editedMessage);
      }
      if (editedMessage.caption) {
        this.bot.emit('edited_message_caption', editedMessage);
      }
    } else if (channelPost) {
      debug('Process Update channel_post %j', channelPost);
      this.bot.emit('channel_post', channelPost);
    } else if (editedChannelPost) {
      debug('Process Update edited_channel_post %j', editedChannelPost);
      this.bot.emit('edited_channel_post', editedChannelPost);
      if (editedChannelPost.text) {
        this.bot.emit('edited_channel_post_text', editedChannelPost);
      }
      if (editedChannelPost.caption) {
        this.bot.emit('edited_channel_post_caption', editedChannelPost);
      }
    } else if (businessConnection) {
      debug('Process Update business_connection %j', businessConnection);
      this.bot.emit('business_connection', businessConnection);
    } else if (businesssMessage) {
      debug('Process Update business_message %j', businesssMessage);
      this.bot.emit('business_message', businesssMessage);
    } else if (editedBusinessMessage) {
      debug('Process Update edited_business_message %j', editedBusinessMessage);
      this.bot.emit('edited_business_message', editedBusinessMessage);
    } else if (deletedBusinessMessage) {
      debug('Process Update deleted_business_messages %j', deletedBusinessMessage);
      this.bot.emit('deleted_business_messages', deletedBusinessMessage);
    } else if (messageReaction) {
      debug('Process Update message_reaction %j', messageReaction);
      this.bot.emit('message_reaction', messageReaction);
    } else if (messageReactionCount) {
      debug('Process Update message_reaction_count %j', messageReactionCount);
      this.bot.emit('message_reaction_count', messageReactionCount);
    } else if (inlineQuery) {
      debug('Process Update inline_query %j', inlineQuery);
      this.bot.emit('inline_query', inlineQuery);
    } else if (chosenInlineResult) {
      debug('Process Update chosen_inline_result %j', chosenInlineResult);
      this.bot.emit('chosen_inline_result', chosenInlineResult);
    } else if (callbackQuery) {
      debug('Process Update callback_query %j', callbackQuery);
      this.bot.emit('callback_query', callbackQuery);
    } else if (shippingQuery) {
      debug('Process Update shipping_query %j', shippingQuery);
      this.bot.emit('shipping_query', shippingQuery);
    } else if (preCheckoutQuery) {
      debug('Process Update pre_checkout_query %j', preCheckoutQuery);
      this.bot.emit('pre_checkout_query', preCheckoutQuery);
    } else if (purchasedPaidMedia) {
      debug('Process Update purchased_paid_media %j', purchasedPaidMedia);
      this.bot.emit('purchased_paid_media', purchasedPaidMedia);
    } else if (poll) {
      debug('Process Update poll %j', poll);
      this.bot.emit('poll', poll);
    } else if (pollAnswer) {
      debug('Process Update poll_answer %j', pollAnswer);
      this.bot.emit('poll_answer', pollAnswer);
    } else if (chatMember) {
      debug('Process Update chat_member %j', chatMember);
      this.bot.emit('chat_member', chatMember);
    } else if (myChatMember) {
      debug('Process Update my_chat_member %j', myChatMember);
      this.bot.emit('my_chat_member', myChatMember);
    } else if (chatJoinRequest) {
      debug('Process Update my_chat_member %j', chatJoinRequest);
      this.bot.emit('chat_join_request', chatJoinRequest);
    } else if (chatBoost) {
      debug('Process Update chat_boost %j', chatBoost);
      this.bot.emit('chat_boost', chatBoost);
    } else if (removedChatBoost) {
      debug('Process Update removed_chat_boost %j', removedChatBoost);
      this.bot.emit('removed_chat_boost', removedChatBoost);
    }
  }
}

module.exports = TelegramBotMessages;
