import { Request, Response, NextFunction } from 'express';
import { Room, User } from '../models';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { generateAgoraToken } from '../config/agora';

export const roomController = {
  async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { country, tab = 'party' } = req.query as any;
      const callerId = req.user?.userId;

      let followingSet = new Set<string>();
      if (callerId) {
        const caller = await User.findById(callerId).select('following');
        if (caller && caller.following) {
          followingSet = new Set(caller.following.map((f) => f.toString()));
        }
      }

      // Clean up any stale closed or owner-less rooms
      await Room.deleteMany({
        $or: [{ status: 'closed' }, { ownerId: null }, { ownerId: { $exists: false } }],
      }).catch(() => {});

      const filter: any = { isPrivate: false, status: 'active' };

      if (country) {
        const codes = String(country).split(',').map((c: string) => c.trim().toUpperCase()).filter(Boolean);
        if (codes.length > 0) {
          filter['country'] = { $in: codes };
        }
      }

      if (tab === 'following') {
        const followingArray = Array.from(followingSet);
        filter.$or = [
          { ownerId: { $in: followingArray } },
          { 'seats.userId': { $in: followingArray } },
        ];
      }

      const total = await Room.countDocuments(filter);
      const rooms = await Room.find(filter)
        .populate('ownerId', 'uid nickname avatar country')
        .populate('seats.userId', 'uid nickname avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const validRooms = rooms.filter((room) => !!room.ownerId);

      const data = validRooms.map((room) => {
        const owner = room.ownerId as any;
        const activeSeats = (room.seats || []).filter((s) => s.userId);
        const memberAvatars = activeSeats
          .map((s: any) => (s.userId && typeof s.userId === 'object' ? s.userId.avatar : ''))
          .filter(Boolean);

        const followingInside =
          (owner?._id && followingSet.has(owner._id.toString())) ||
          activeSeats.some(
            (s: any) => s.userId?._id && followingSet.has(s.userId._id.toString())
          );

        return {
          _id: room._id,
          name: room.name,
          description: room.description,
          thumbnail: owner?.avatar || '',
          owner,
          memberCount: activeSeats.length,
          viewerCount: activeSeats.length,
          memberAvatars,
          tag: { type: 'chat', label: 'Party' },
          followingInside,
        };
      });

      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async listRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      await Room.deleteMany({
        $or: [{ status: 'closed' }, { ownerId: null }, { ownerId: { $exists: false } }],
      }).catch(() => {});
      const filter = { isPrivate: false, status: 'active' };
      const total = await Room.countDocuments(filter);
      const rooms = await Room.find(filter)
        .populate('ownerId', 'uid nickname avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const validRooms = rooms.filter((room) => !!room.ownerId);

      sendPaginated(res, validRooms, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId).select('gender');
      if (!user?.gender || user.gender === 'unspecified') {
        sendError(res, 'Gender selection is mandatory before creating a party room. Please select your gender in profile.', 400);
        return;
      }

      const { name, description, seatCount = 8, isPrivate, password } = req.body;

      // Clean up any previous rooms created by this user
      await Room.deleteMany({ ownerId: req.user!.userId });

      const seats = Array.from({ length: seatCount }, (_, i) => ({
        index: i + 1,
        userId: null,
        isLocked: i === 0, // First seat is host seat
      }));
      seats[0].userId = req.user!.userId as any; // Host takes seat 1

      const room = await Room.create({
        ownerId: req.user!.userId,
        name: name || 'Party Room',
        description: description || '',
        seats,
        isPrivate: isPrivate || false,
        password,
        status: 'active',
      });

      const populated = await room.populate('ownerId', 'uid nickname avatar');
      sendSuccess(res, populated, 'Room created', 201);
    } catch (error) {
      next(error);
    }
  },

  async closeRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        const io = req.app.get('io');
        if (io) {
          io.to(`room:${req.params.id}`).emit('room:closed', { roomId: String(req.params.id), message: 'Host closed the party room permanently' });
          io.emit('room:deleted', { roomId: String(req.params.id) });
        }
        sendSuccess(res, null, 'Room already closed or deleted');
        return;
      }

      const userId = req.user!.userId;
      if (room.ownerId.toString() !== userId && !req.user?.isAdmin) {
        sendError(res, 'Only the host can close this room permanently', 403);
        return;
      }

      await Room.deleteOne({ _id: room._id });

      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room._id}`).emit('room:closed', { roomId: String(room._id), message: 'Host closed the party room permanently' });
        io.emit('room:deleted', { roomId: String(room._id) });
      }

      sendSuccess(res, null, 'Party room permanently closed');
    } catch (error) {
      next(error);
    }
  },

  async getRoom(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.params.id || req.params.id.length !== 24) {
        sendError(res, 'Party room not found', 404);
        return;
      }

      const room = await Room.findById(req.params.id)
        .populate('ownerId', 'uid nickname avatar')
        .populate('seats.userId', 'uid nickname avatar');
      if (!room || room.status === 'closed' || !room.ownerId) {
        if (room && !room.ownerId) {
          await Room.deleteOne({ _id: room._id }).catch(() => {});
        }
        sendError(res, 'Party room not found or has been closed', 404);
        return;
      }

      // Self-heal: Deduplicate seats if any user occupies multiple seats
      const seen = new Set<string>();
      let changed = false;
      for (const seat of room.seats) {
        if (seat.userId) {
          const uidStr = typeof seat.userId === 'object' && '_id' in (seat.userId as any)
            ? (seat.userId as any)._id.toString()
            : seat.userId.toString();
          if (seen.has(uidStr)) {
            seat.userId = undefined;
            changed = true;
          } else {
            seen.add(uidStr);
          }
        }
      }
      if (changed) {
        await room.save();
        await room.populate('seats.userId', 'uid nickname avatar');
      }

      const channelName = `room_${room._id}`;
      const token = generateAgoraToken(channelName, 0, 'publisher');

      const data = room.toObject();
      sendSuccess(res, {
        ...data,
        agoraChannel: channelName,
        agoraToken: token,
      });
    } catch (error) {
      next(error);
    }
  },

  async joinRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId).select('gender');
      if (!user?.gender || user.gender === 'unspecified') {
        sendError(res, 'Gender selection is mandatory before joining a party room. Please select your gender in profile.', 400);
        return;
      }

      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }

      if (room.status === 'closed') {
        sendError(res, 'This room has been closed', 403);
        return;
      }

      const userId = req.user!.userId;
      const isHost = room.ownerId.toString() === userId;

      // Host already occupies seat 1; do not assign host to a guest seat
      if (isHost) {
        const populated = await room.populate('seats.userId', 'uid nickname avatar');
        sendSuccess(res, populated);
        return;
      }

      // Deduplicate: If user is ALREADY seated in this room, do not assign another seat!
      const existingSeat = room.seats.find(
        (s) => s.userId && s.userId.toString() === userId
      );

      if (existingSeat) {
        const populated = await room.populate('seats.userId', 'uid nickname avatar');
        sendSuccess(res, populated);
        return;
      }

      const seatIndex = req.body.seatIndex ?? -1;
      let seat = room.seats.find((s) => s.index === seatIndex);

      if (!seat || seat.userId || seat.isLocked) {
        // Find first empty guest seat (index > 1)
        seat = room.seats.find((s) => s.index > 1 && !s.userId && !s.isLocked);
      }

      if (seat) {
        seat.userId = userId as any;
        await room.save();
      }

      const populated = await room.populate('seats.userId', 'uid nickname avatar');

      // Emit socket event
      const io = req.app.get('io');
      if (io && seat) {
        io.to(`room:${room._id}`).emit('room:seat:update', { roomId: room._id, seats: populated.seats });
      }

      sendSuccess(res, populated);
    } catch (error) {
      next(error);
    }
  },

  async leaveRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendSuccess(res, null, 'Party room already closed or left');
        return;
      }

      const userId = req.user!.userId;
      const isHost = room.ownerId.toString() === userId;

      if (isHost) {
        // Host navigating away does NOT destroy the party room.
        // Explicit room closure is done via closeRoom (DELETE /rooms/:id).
        sendSuccess(res, null, 'Host left room view');
        return;
      }

      const seat = room.seats.find(
        (s) => s.userId?.toString() === userId
      );

      if (seat) {
        seat.userId = undefined;
        await room.save();
        const populated = await room.populate('seats.userId', 'uid nickname avatar');
        const io = req.app.get('io');
        if (io) {
          io.to(`room:${room._id}`).emit('room:seat:update', { roomId: room._id, seats: populated.seats });
        }
      }

      sendSuccess(res, null, 'Left room');
    } catch (error) {
      next(error);
    }
  },

  async kickMember(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }

      if (room.ownerId.toString() !== req.user!.userId) {
        sendError(res, 'Only the host can kick members', 403);
        return;
      }

      const index = parseInt(req.params.index, 10);
      const seat = room.seats.find((s) => s.index === index);

      if (!seat || !seat.userId) {
        sendError(res, 'No member in this seat', 400);
        return;
      }

      const kickedUserId = seat.userId.toString();
      seat.userId = undefined;
      await room.save();

      const populated = await room.populate('seats.userId', 'uid nickname avatar');
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room._id}`).emit('room:seat:update', { roomId: room._id, seats: populated.seats });
        io.to(`room:${room._id}`).emit('room:user-kicked', { roomId: room._id, seatIndex: index, userId: kickedUserId });
      }

      sendSuccess(res, populated, 'Member kicked from seat');
    } catch (error) {
      next(error);
    }
  },

  async sit(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId).select('gender');
      if (!user?.gender || user.gender === 'unspecified') {
        sendError(res, 'Gender selection is mandatory before taking a party seat. Please select your gender in profile.', 400);
        return;
      }

      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }
      const index = parseInt(req.params.index, 10);
      const seat = room.seats.find((s) => s.index === index);
      if (!seat) {
        sendError(res, 'Seat not found', 404);
        return;
      }
      if (seat.isLocked) {
        sendError(res, 'Seat is locked', 400);
        return;
      }
      if (seat.userId) {
        sendError(res, 'Seat is already taken', 400);
        return;
      }
      // Remove user from any other seat in this room
      room.seats.forEach(s => {
        if (s.userId?.toString() === req.user!.userId) {
          s.userId = undefined;
        }
      });
      seat.userId = req.user!.userId as any;
      await room.save();

      const populated = await room.populate('seats.userId', 'uid nickname avatar');
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room._id}`).emit('room:seat:update', { roomId: room._id, seats: populated.seats });
      }

      sendSuccess(res, populated, 'Took seat');
    } catch (error) {
      next(error);
    }
  },

  async stand(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }
      const index = parseInt(req.params.index, 10);
      const seat = room.seats.find((s) => s.index === index);
      if (!seat) {
        sendError(res, 'Seat not found', 404);
        return;
      }
      if (seat.userId?.toString() !== req.user!.userId && req.user!.userId !== room.ownerId.toString()) {
        sendError(res, 'Not authorized', 403);
        return;
      }
      seat.userId = undefined;
      await room.save();

      const populated = await room.populate('seats.userId', 'uid nickname avatar');

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room._id}`).emit('room:seat:update', { roomId: room._id, seats: populated.seats });
      }

      sendSuccess(res, populated, 'Left seat');
    } catch (error) {
      next(error);
    }
  },

  async lockSeat(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }
      const isOwner = room.ownerId.toString() === req.user!.userId;
      const isAdmin = room.admins?.some((a) => a.toString() === req.user!.userId);
      if (!isOwner && !isAdmin && !req.user?.isAdmin) {
        sendError(res, 'Only host or room admins can lock seats', 403);
        return;
      }

      const index = parseInt(req.params.index, 10);
      const seat = room.seats.find((s) => s.index === index);
      if (!seat) {
        sendError(res, 'Seat not found', 404);
        return;
      }

      seat.isLocked = req.body.locked ?? true;
      await room.save();

      const populated = await room.populate('seats.userId', 'uid nickname avatar');
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room._id}`).emit('room:seat:update', { roomId: room._id, seats: populated.seats });
      }

      sendSuccess(res, populated, seat.isLocked ? 'Seat locked' : 'Seat unlocked');
    } catch (error) {
      next(error);
    }
  },

  async muteSeat(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }
      const isOwner = room.ownerId.toString() === req.user!.userId;
      const isAdmin = room.admins?.some((a) => a.toString() === req.user!.userId);
      if (!isOwner && !isAdmin && !req.user?.isAdmin) {
        sendError(res, 'Only host or room admins can mute seats', 403);
        return;
      }

      const index = parseInt(req.params.index, 10);
      const seat = room.seats.find((s) => s.index === index);
      if (!seat) {
        sendError(res, 'Seat not found', 404);
        return;
      }

      (seat as any).isMuted = req.body.muted ?? true;
      await room.save();

      const populated = await room.populate('seats.userId', 'uid nickname avatar');
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room._id}`).emit('room:seat:update', { roomId: room._id, seats: populated.seats });
      }

      sendSuccess(res, populated, (seat as any).isMuted ? 'Seat muted' : 'Seat unmuted');
    } catch (error) {
      next(error);
    }
  },

  async setAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }
      if (room.ownerId.toString() !== req.user!.userId && !req.user?.isAdmin) {
        sendError(res, 'Only host can manage room admins', 403);
        return;
      }

      const { userId, action } = req.body;
      if (!userId) {
        sendError(res, 'Target user ID is required', 400);
        return;
      }

      if (!room.admins) room.admins = [];

      if (action === 'add') {
        if (!room.admins.some((a) => a.toString() === userId)) {
          room.admins.push(userId as any);
        }
      } else if (action === 'remove') {
        room.admins = room.admins.filter((a) => a.toString() !== userId);
      }

      await room.save();
      sendSuccess(res, { admins: room.admins }, 'Room admins updated');
    } catch (error) {
      next(error);
    }
  },
};
