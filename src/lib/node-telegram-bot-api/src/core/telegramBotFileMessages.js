class TelegramBotFileMessages {
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Send photo
   * @param {Number|String} chatId  Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * @param {String|stream.Stream|Buffer} photo A file path or a Stream. Can
   * also be a `file_id` previously uploaded
   * @param {Object} [options] Additional Telegram query options
   * @param {Object} [fileOptions] Optional file related meta-data
   * @return {Promise} On success, the sent [Message](https://core.telegram.org/bots/api#message) object is returned
   * @see https://core.telegram.org/bots/api#sendphoto
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendPhoto(chatId, photo, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this.bot._formatSendData('photo', photo, fileOptions);
      opts.formData = sendData[0];
      opts.qs.photo = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this.bot._request('sendPhoto', opts);
  }

  /**
  * Send audio
  *
  * **Your audio must be in the .MP3 or .M4A format.**
  *
  * @param {Number|String} chatId  Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
  * @param {String|stream.Stream|Buffer} audio A file path, Stream or Buffer.
  * Can also be a `file_id` previously uploaded.
  * @param {Object} [options] Additional Telegram query options
  * @param {Object} [fileOptions] Optional file related meta-data
  * @return {Promise} On success, the sent [Message](https://core.telegram.org/bots/api#message) object is returned
  * @see https://core.telegram.org/bots/api#sendaudio
  * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
  */
  sendAudio(chatId, audio, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };

    opts.qs.chat_id = chatId;

    try {
      const sendData = this.bot._formatSendData('audio', audio, fileOptions);
      opts.formData = sendData[0];
      opts.qs.audio = sendData[1];
      this.bot._fixAddFileThumbnail(options, opts);
    } catch (ex) {
      return Promise.reject(ex);
    }

    return this.bot._request('sendAudio', opts);
  }

  /**
  * Send Document
  * @param {Number|String} chatId  Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
  * @param {String|stream.Stream|Buffer} doc A file path, Stream or Buffer.
  * Can also be a `file_id` previously uploaded.
  * @param {Object} [options] Additional Telegram query options
  * @param {Object} [fileOptions] Optional file related meta-data
  * @return {Promise}  On success, the sent [Message](https://core.telegram.org/bots/api#message) object is returned
  * @see https://core.telegram.org/bots/api#sendDocument
  * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
  */
  sendDocument(chatId, doc, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this.bot._formatSendData('document', doc, fileOptions);
      opts.formData = sendData[0];
      opts.qs.document = sendData[1];
      this.bot._fixAddFileThumbnail(options, opts);
    } catch (ex) {
      return Promise.reject(ex);
    }

    return this.bot._request('sendDocument', opts);
  }

  /**
   * Use this method to send video files, **Telegram clients support mp4 videos** (other formats may be sent as Document).
   *
   * @param {Number|String} chatId  Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * @param {String|stream.Stream|Buffer} video A file path or Stream.
   * Can also be a `file_id` previously uploaded.
   * @param {Object} [options] Additional Telegram query options
   * @param {Object} [fileOptions] Optional file related meta-data
   * @return {Promise} On success, the sent [Message](https://core.telegram.org/bots/api#message) object is returned
   * @see https://core.telegram.org/bots/api#sendvideo
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendVideo(chatId, video, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this.bot._formatSendData('video', video, fileOptions);
      opts.formData = sendData[0];
      opts.qs.video = sendData[1];
      this.bot._fixAddFileThumbnail(options, opts);
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this.bot._request('sendVideo', opts);
  }

  /**
   * Use this method to send animation files (GIF or H.264/MPEG-4 AVC video without sound).
   * @param {Number|String} chatId  Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * @param {String|stream.Stream|Buffer} animation A file path, Stream or Buffer.
   * Can also be a `file_id` previously uploaded.
   * @param {Object} [options] Additional Telegram query options
   * @param {Object} [fileOptions] Optional file related meta-data
   * @return {Promise} On success, the sent [Message](https://core.telegram.org/bots/api#message) object is returned
   * @see https://core.telegram.org/bots/api#sendanimation
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendAnimation(chatId, animation, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this.bot._formatSendData('animation', animation, fileOptions);
      opts.formData = sendData[0];
      opts.qs.animation = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this.bot._request('sendAnimation', opts);
  }

  /**
   * Send voice
   *
   * **Your audio must be in an .OGG file encoded with OPUS**, or in .MP3 format, or in .M4A format (other formats may be sent as Audio or Document)
   * @param {Number|String} chatId  Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * @param {String|stream.Stream|Buffer} voice A file path, Stream or Buffer.
   * Can also be a `file_id` previously uploaded.
   * @param {Object} [options] Additional Telegram query options
   * @param {Object} [fileOptions] Optional file related meta-data
   * @return {Promise} On success, the sent [Message](https://core.telegram.org/bots/api#message) object is returned
   * @see https://core.telegram.org/bots/api#sendvoice
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendVoice(chatId, voice, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this.bot._formatSendData('voice', voice, fileOptions);
      opts.formData = sendData[0];
      opts.qs.voice = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this.bot._request('sendVoice', opts);
  }

  /**
   * Use this method to send video messages
   * Telegram clients support **rounded square MPEG4 videos** of up to 1 minute long.
   * @param {Number|String} chatId  Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * @param {String|stream.Stream|Buffer} videoNote A file path or Stream.
   * Can also be a `file_id` previously uploaded.
   * @param {Object} [options] Additional Telegram query options
   * @param {Object} [fileOptions] Optional file related meta-data
   * @return {Promise} On success, the sent [Message](https://core.telegram.org/bots/api#message) object is returned
   * @info The length parameter is actually optional. However, the API (at time of writing) requires you to always provide it until it is fixed.
   * @see https://core.telegram.org/bots/api#sendvideonote
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
  */
  sendVideoNote(chatId, videoNote, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this.bot._formatSendData('video_note', videoNote, fileOptions);
      opts.formData = sendData[0];
      opts.qs.video_note = sendData[1];
      this.bot._fixAddFileThumbnail(options, opts);
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this.bot._request('sendVideoNote', opts);
  }
}

module.exports = TelegramBotFileMessages;
