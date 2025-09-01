// shims
require('array.prototype.findindex').shim(); // for Node.js v0.x

const debug = require('debug')('node-telegram-bot-api');
const EventEmitter = require('eventemitter3');
const fileType = require('file-type');
const fs = require('fs');
const mime = require('mime');
const path = require('path');
const pump = require('pump');
const qs = require('querystring');
const stream = require('stream');
const URL = require('url');
const axios = require('axios');
const https = require('https');
const http = require('http');
const errors = require('../errors');
const TelegramBotPolling = require('../telegramPolling');
const TelegramBotWebHook = require('../telegramWebHook');
const deprecate = require('../utils').deprecate;

const _messageTypes = [
  'text',
  'animation',
  'audio',
  'channel_chat_created',
  'contact',
  'delete_chat_photo',
  'dice',
  'document',
  'game',
  'group_chat_created',
  'invoice',
  'left_chat_member',
  'location',
  'migrate_from_chat_id',
  'migrate_to_chat_id',
  'new_chat_members',
  'new_chat_photo',
  'new_chat_title',
  'passport_data',
  'photo',
  'pinned_message',
  'poll',
  'sticker',
  'successful_payment',
  'supergroup_chat_created',
  'video',
  'video_note',
  'voice',
  'video_chat_started',
  'video_chat_ended',
  'video_chat_participants_invited',
  'video_chat_scheduled',
  'message_auto_delete_timer_changed',
  'chat_invite_link',
  'chat_member_updated',
  'web_app_data',
  'message_reaction',
];

const _deprecatedMessageTypes = [
  'new_chat_participant', 'left_chat_participant',
];

/**
 * JSON-serialize data. If the provided data is already a String,
 * return it as is.
 * @private
 * @param {*} data
 * @return {String}
 */
function stringify(data) {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data);
}

// Create agents for keep-alive connections
const httpsAgent = new https.Agent({ keepAlive: true });
const httpAgent = new http.Agent({ keepAlive: true });

// Create a wrapper for axios to mimic request-promise behavior
const request = (options) => {
  const axiosOptions = {
    method: options.method,
    url: options.url,
    httpsAgent: httpsAgent,
    httpAgent: httpAgent,
    // Transform options to axios format
  };

  // Handle form data
  if (options.form) {
    const formData = new URLSearchParams();
    for (const key in options.form) {
      formData.append(key, options.form[key]);
    }
    axiosOptions.data = formData.toString();
    axiosOptions.headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  // Handle query string
  if (options.qs) {
    axiosOptions.params = options.qs;
  }

  // Handle multipart form data (files)
  if (options.formData) {
    const formData = new (require('form-data'))();
    for (const key in options.formData) {
      const value = options.formData[key];
      if (value.value && value.options) {
        formData.append(key, value.value, value.options);
      } else {
        formData.append(key, value);
      }
    }
    axiosOptions.data = formData;
    axiosOptions.headers = formData.getHeaders();
  }

  // Handle JSON data
  if (options.json && typeof options.json !== 'boolean') {
    axiosOptions.data = options.json;
    axiosOptions.headers = {
      'Content-Type': 'application/json',
    };
  }

  // Add any additional headers
  if (options.headers) {
    axiosOptions.headers = { ...axiosOptions.headers, ...options.headers };
  }

  return axios(axiosOptions)
    .then((resp) => {
      // Mimic request-promise response structure
      return {
        body: typeof resp.data === 'object' ? JSON.stringify(resp.data) : resp.data,
        statusCode: resp.status,
        headers: resp.headers,
      };
    });
};

// Create a wrapper for streamed requests
const streamedRequest = (options) => {
  const axiosOptions = {
    method: 'GET',
    url: options.uri || options.url,
    responseType: 'stream',
    httpsAgent: httpsAgent,
    httpAgent: httpAgent,
  };

  // Add any additional headers
  if (options.headers) {
    axiosOptions.headers = options.headers;
  }

  return axios(axiosOptions)
    .then((resp) => resp.data)
    .catch((error) => {
      throw error;
    });
};

module.exports = {
  errors,
  debug,
  EventEmitter,
  fileType,
  request,
  streamedRequest,
  qs,
  stream,
  mime,
  path,
  URL,
  fs,
  pump,
  TelegramBotPolling,
  TelegramBotWebHook,
  deprecate,
  _messageTypes,
  _deprecatedMessageTypes,
  stringify,
};
