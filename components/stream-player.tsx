import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ConnectionState,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';

import { Stream, fetchViewerToken } from '@/lib/streams';
import { CommentPanel } from '@/features/social/components/comment-panel';
import { FloatingHearts } from '@/features/social/components/floating-hearts';
import { FollowButton } from '@/features/social/components/follow-button';
import { useComments } from '@/features/social/hooks/use-comments';
import { useSocket } from '@/lib/api/realtime';

const { width } = Dimensions.get('window');

// One stable ID per page load, shared across all stream connections in this tab.
// Passed as the LiveKit participant identity so the backend doesn't fall back to
// request.remote_addr, which is the load balancer IP — identical for every viewer.
const SESSION_VIEWER_ID = `viewer-${Math.random().toString(36).slice(2)}`;

interface StreamPlayerProps {
  stream: Stream;
  isActive: boolean;
  playerHeight: number;
}

/**
 * Web variant of StreamPlayer.
 *
 * Same component name + props as the native variant; Expo/Metro picks the
 * `.web.tsx` file automatically. Renders the LiveKit camera track into a
 * plain HTML <video> element via livekit-client's attach() helper.
 *
 * Why a separate file: @livekit/react-native cannot run in browsers (it
 * wraps react-native-webrtc), and livekit-client cannot run in RN (it
 * uses browser-only APIs). Same protocol, two SDKs.
 */
export default function StreamPlayer({ stream, isActive, playerHeight }: StreamPlayerProps) {
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<string>('idle');

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const attachedTrackRef = useRef<RemoteTrack | null>(null);
  const attachedAudioRef = useRef<RemoteTrack | null>(null);

  const { socket } = useSocket();
  const { comments, sendComment, sendEmote } = useComments(stream.id);

  // Connect on mount — do not wait for isActive. Every stream in the list
  // connects immediately so the video is ready regardless of which item the
  // user scrolls to. isActive only gates the Socket.IO room join below.
  useEffect(() => {
    if (roomRef.current !== null) return;

    const run = async () => {
      try {
        setStatus('Loading token…');
        const tokenResp = await fetchViewerToken(stream.id, { identity: SESSION_VIEWER_ID });
        if (roomRef.current !== null) return; // unmount beat us

        const room = new Room({ adaptiveStream: false, dynacast: false });
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (roomRef.current !== room) return;
          if (track.kind === Track.Kind.Video && videoElRef.current) {
            track.attach(videoElRef.current);
            attachedTrackRef.current = track;
            setStatus('connected');
          } else if (track.kind === Track.Kind.Audio) {
            const el = track.attach() as HTMLAudioElement;
            document.body.appendChild(el);
            audioElRef.current = el;
            attachedAudioRef.current = track;
          }
        });
        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (roomRef.current !== room) return;
          track.detach();
          if (attachedTrackRef.current === track) {
            attachedTrackRef.current = null;
          }
          if (attachedAudioRef.current === track) {
            audioElRef.current?.remove();
            audioElRef.current = null;
            attachedAudioRef.current = null;
          }
        });
        room.on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
          if (roomRef.current !== room) return;
          if (s === ConnectionState.Disconnected) setStatus('disconnected');
        });

        setStatus('Connecting…');
        await room.connect(tokenResp.livekit_url, tokenResp.viewer_token);
        if (roomRef.current !== room) {
          room.disconnect();
          return;
        }
        // Publisher may already be in the room — walk participants to pick up
        // any video track that arrived before TrackSubscribed could fire.
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub: RemoteTrackPublication) => {
            if (!pub.track) return;
            if (pub.track.kind === Track.Kind.Video && videoElRef.current) {
              pub.track.attach(videoElRef.current);
              attachedTrackRef.current = pub.track;
              setStatus('connected');
            } else if (pub.track.kind === Track.Kind.Audio) {
              const el = pub.track.attach() as HTMLAudioElement;
              document.body.appendChild(el);
              audioElRef.current = el;
              attachedAudioRef.current = pub.track;
            }
          });
        });
      } catch (err) {
        setStatus(`error: ${String(err).slice(0, 80)}`);
      }
    };

    run();
  }, [stream.id]); // stream.id is stable per mount; effect runs exactly once

  // Disconnect only when the component fully unmounts (stream removed from list).
  useEffect(() => {
    return () => {
      if (attachedTrackRef.current && videoElRef.current) {
        try { attachedTrackRef.current.detach(videoElRef.current); } catch {}
      }
      attachedTrackRef.current = null;
      if (attachedAudioRef.current) {
        try { attachedAudioRef.current.detach(); } catch {}
        attachedAudioRef.current = null;
      }
      audioElRef.current?.remove();
      audioElRef.current = null;
      const r = roomRef.current;
      roomRef.current = null;
      r?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !isActive) return;
    socket.emit('join_room', { stream_id: stream.id });
    return () => {
      socket.emit('leave_room', { stream_id: stream.id });
    };
  }, [socket, isActive, stream.id]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendComment(inputText.trim());
    setInputText('');
  };

  const handleHeart = () => {
    sendEmote('heart');
    setHeartTrigger((t) => t + 1);
  };

  return (
    <View style={[styles.container, { height: playerHeight }]}>
      {/* Plain DOM <video> wrapped in a React Native View. react-native-web
          forwards the ref to the underlying element when used like this. */}
      <video
        ref={videoElRef as any}
        style={styles.videoEl as any}
        autoPlay
        playsInline
        muted={false}
      />
      {status !== 'connected' ? (
        <View style={[styles.placeholder, { height: playerHeight }]}>
          <Text style={styles.placeholderText}>{status}</Text>
        </View>
      ) : null}

      <View style={styles.topBar}>
        <View style={styles.streamerPill}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.username} numberOfLines={1}>
            {stream.title || 'Untitled'}
          </Text>
        </View>
        <View style={styles.viewerCount}>
          <Text style={styles.eyeIcon}>👁</Text>
          <Text style={styles.viewerNum}>—</Text>
        </View>
        <FollowButton userId={null} />
      </View>

      <CommentPanel comments={comments} />
      <FloatingHearts trigger={heartTrigger} />

      <View style={styles.bottomRow}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type ..."
            placeholderTextColor="#888"
            onSubmitEditing={handleSend}
            returnKeyType="send"
            maxLength={500}
          />
          <TouchableOpacity onPress={handleSend} hitSlop={8} style={styles.sendBtn}>
            <Ionicons name="send" size={16} color={inputText.trim() ? '#fff' : '#555'} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.heartBtn} onPress={handleHeart} activeOpacity={0.7}>
          <Text style={styles.heartIcon}>❤️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, backgroundColor: '#000' },
  videoEl: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#000',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  placeholderText: { color: '#888', fontSize: 14 },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 8,
  },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#888' },
  username: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  eyeIcon: { fontSize: 16 },
  viewerNum: { color: '#fff', fontSize: 14 },
  bottomRow: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF4458',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: { fontSize: 24 },
});
