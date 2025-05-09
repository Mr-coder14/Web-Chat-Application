
class MessageModel {
    constructor(message, senderId, timestamp) {
      this.message = message;
      this.senderId = senderId;
      this.timestamp = timestamp;
      this.seen = false;
    }
  
    setSeen(seen) {
      this.seen = seen;
    }
  }
  
  export default MessageModel;