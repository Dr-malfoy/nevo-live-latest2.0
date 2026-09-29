import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { env } from './env';

export const generateAgoraToken = (
  channelName: string,
  uid: number = 0,
  role: 'publisher' | 'subscriber' = 'subscriber'
): string => {
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  return RtcTokenBuilder.buildTokenWithUid(
    env.agora.appId,
    env.agora.appCertificate,
    channelName,
    uid,
    agoraRole,
    privilegeExpiredTs
  );
};

export const generateChannelName = (userId: string): string => {
  return `stream_${userId}_${Date.now()}`;
};
