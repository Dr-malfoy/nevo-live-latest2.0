import { Socket } from 'socket.io';
import { chatService } from '../services/chat.service';

export const registerChatHandlers = (socket: Socket): void => {
  socket.on('chat:send', async ({ chatId, message, recipientId }, ack) => {
    try {
      const senderId = socket.data.user?.userId;
      if (!senderId) return;
      const msg = await chatService.sendMessage(chatId, senderId, message);
      // Echo back to the sender's other devices
      socket.to(`user:${senderId}`).emit('chat:message', {
        chatId,
        message: msg.toObject(),
        senderId,
      });
      if (typeof ack === 'function') ack({ success: true, message: msg });
    } catch (err: any) {
      if (typeof ack === 'function') ack({ success: false, error: err?.message || 'Failed to send' });
    }
  });

  // Read receipt — marks incoming messages read and notifies the sender live.
  socket.on('chat:read', async ({ chatId }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !chatId) return;
      const result = await chatService.markChatRead(chatId, userId);
      if (typeof ack === 'function') ack({ success: true, ...result });
    } catch (err: any) {
      if (typeof ack === 'function') ack({ success: false, error: err?.message || 'Failed to mark read' });
    }
  });

  // Delivery receipt — marks incoming messages delivered and notifies sender live.
  socket.on('chat:delivered', async ({ chatId }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !chatId) return;
      const result = await chatService.markChatDelivered(chatId, userId);
      if (typeof ack === 'function') ack({ success: true, ...result });
    } catch (err: any) {
      if (typeof ack === 'function') ack({ success: false, error: err?.message || 'Failed to mark delivered' });
    }
  });
};

