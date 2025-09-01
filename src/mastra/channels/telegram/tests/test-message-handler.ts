// Test script for Telegram message handler
import TelegramBot from 'node-telegram-bot-api';

// Mock message objects for testing
const mockTextMessage: TelegramBot.Message = {
  message_id: 1,
  from: {
    id: 123456789,
    is_bot: false,
    first_name: 'John',
    username: 'john_doe'
  },
  chat: {
    id: 987654321,
    first_name: 'John',
    username: 'john_doe',
    type: 'private'
  },
  date: Math.floor(Date.now() / 1000),
  text: 'Hello, this is a test message'
};

const mockPhotoMessage: TelegramBot.Message = {
  message_id: 2,
  from: {
    id: 123456789,
    is_bot: false,
    first_name: 'John',
    username: 'john_doe'
  },
  chat: {
    id: 987654321,
    first_name: 'John',
    username: 'john_doe',
    type: 'private'
  },
  date: Math.floor(Date.now() / 1000),
  photo: [
    {
      file_id: 'AgACAgQAAxkBAAIB',
      file_unique_id: 'AQAD',
      width: 320,
      height: 240
    },
    {
      file_id: 'AgACAgQAAxkBAAIB2',
      file_unique_id: 'AQAD2',
      width: 640,
      height: 480
    }
  ]
};

const mockDocumentMessage: TelegramBot.Message = {
  message_id: 3,
  from: {
    id: 123456789,
    is_bot: false,
    first_name: 'John',
    username: 'john_doe'
  },
  chat: {
    id: 987654321,
    first_name: 'John',
    username: 'john_doe',
    type: 'private'
  },
  date: Math.floor(Date.now() / 1000),
  document: {
    file_id: 'BQACAgQAAxkBAAIC',
    file_unique_id: 'BQAD',
    file_name: 'test_document.pdf'
  }
};

console.log('Mock messages created successfully:');
console.log('- Text message:', mockTextMessage.text);
console.log('- Photo message has photo:', !!mockPhotoMessage.photo);
console.log('- Document message filename:', mockDocumentMessage.document?.file_name);

export { mockTextMessage, mockPhotoMessage, mockDocumentMessage };